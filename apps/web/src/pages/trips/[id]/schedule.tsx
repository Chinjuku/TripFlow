import { useParams } from 'react-router-dom';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/navigation/PageHeader';
import { formatLocalizedDate } from '@/lib/utils';
import {
  AddPlaceSheet,
  DayTabsScroller,
  DedupeConfirmModal,
  EditEventSheet,
  MobileTimeline,
  PlacePill,
  RouteFlowCard,
  Timeline,
  TimelineSkeleton,
  DayTabsSkeleton,
  RouteFlowSkeleton,
  TopVotedPanel,
} from '@/components/feat/schedule';
import { useTripSchedulePage } from '@/hooks/useTripSchedulePage';

export default function TripSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const s = useTripSchedulePage(id);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (!id) return null;

  const {
    trip,
    places,
    schedule,
    error,
    isLoading,
    isMobile,
    days,
    activeDay,
    handleSelectDay,
    itemsForDay,
    topVotedForDay,
    topVotedGroups,
    placesById,
    dragging,
    dragPreview,
    timelineElRef,
    pendingResizeIds,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    cancelDrag,
    allowDuplicates,
    handleModeChange,
    pendingDedupe,
    setPendingDedupe,
    confirmDedupe,
    handleResize,
    handleRemove,
    pickPlace,
    setPickPlace,
    editEvent,
    setEditEvent,
    handleAddFromSheet,
    handleSaveFromSheet,
    handleRemoveFromSheet,
  } = s;

  const activeDayMeta = days[activeDay];
  // 0=Sun..6=Sat - drives the opening-hours check for events on this day.
  const activeWeekday = activeDayMeta ? activeDayMeta.date.getDay() : new Date().getDay();
  const dayLabel = activeDayMeta
    ? `${formatLocalizedDate(activeDayMeta.date, i18n.language, { day: 'numeric', month: 'short' })} (${activeDayMeta.label})`
    : t('schedule.dayFallback', 'Day');

  const scheduleLoading = isLoading && schedule === null;

  const content = (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-3 sm:gap-6 sm:px-4 lg:px-0">
      <PageHeader
        backTo={`/trips/${id}`}
        backLabel={t('overview.tripOverview')}
        title={t('schedule.title', 'Trip Schedule')}
        subtitle={
          isMobile
            ? t('schedule.subtitleMobile', 'Tap places below to add them to your day.')
            : t('schedule.subtitle', 'Drag voted places onto the timeline to build each day.')
        }
        withBorder
      />

      {trip ? (
        <DayTabsScroller days={days} activeDay={activeDay} onSelect={handleSelectDay} />
      ) : (
        <DayTabsSkeleton />
      )}

      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {error.message}
        </div>
      )}

      {scheduleLoading ? <RouteFlowSkeleton /> : <RouteFlowCard items={itemsForDay} />}

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="border-border bg-card rounded-2xl border p-3 sm:p-5">
          <div className="border-border mb-4 border-b pb-3">
            <h2 className="text-foreground font-headline text-base font-bold sm:text-lg">
              {dayLabel}
            </h2>
          </div>

          {scheduleLoading ? (
            <TimelineSkeleton />
          ) : isMobile ? (
            <MobileTimeline items={itemsForDay} weekday={activeWeekday} onSelect={setEditEvent} />
          ) : (
            <Timeline
              items={itemsForDay}
              weekday={activeWeekday}
              onRemove={handleRemove}
              onResize={handleResize}
              ghost={dragging?.kind === 'new' ? dragging : null}
              dragPreview={dragging ? dragPreview : null}
              pendingResizeIds={pendingResizeIds}
              timelineRef={(el) => {
                timelineElRef.current = el;
              }}
            />
          )}
        </div>

        <TopVotedPanel
          places={places}
          count={topVotedForDay.length}
          groups={topVotedGroups}
          allowDuplicates={allowDuplicates}
          onModeChange={handleModeChange}
          isMobile={isMobile}
          onPick={setPickPlace}
        />
      </div>
    </div>
  );

  const sheets = (
    <>
      <DedupeConfirmModal
        rows={pendingDedupe}
        onCancel={() => setPendingDedupe(null)}
        onConfirm={confirmDedupe}
      />
      <AddPlaceSheet
        open={pickPlace !== null}
        place={pickPlace}
        dayLabel={dayLabel}
        daySchedule={itemsForDay}
        onCancel={() => setPickPlace(null)}
        onConfirm={handleAddFromSheet}
      />
      <EditEventSheet
        open={editEvent !== null}
        event={editEvent}
        daySchedule={itemsForDay}
        onCancel={() => setEditEvent(null)}
        onSave={handleSaveFromSheet}
        onRemove={handleRemoveFromSheet}
      />
    </>
  );

  if (isMobile) {
    return (
      <>
        {content}
        {sheets}
      </>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={cancelDrag}
      autoScroll={{ threshold: { x: 0, y: 0.2 }, acceleration: 12 }}
    >
      {content}

      <DragOverlay>
        {dragging?.kind === 'new' && placesById.get(dragging.tripPlaceId) ? (
          <PlacePill place={placesById.get(dragging.tripPlaceId)!} dragging />
        ) : dragging?.kind === 'existing' ? (
          <div className="bg-primary/90 text-primary-foreground rounded-md px-3 py-2 text-sm font-semibold shadow-lg">
            {t('schedule.movingEvent', 'Moving event…')}
          </div>
        ) : null}
      </DragOverlay>

      {sheets}
    </DndContext>
  );
}
