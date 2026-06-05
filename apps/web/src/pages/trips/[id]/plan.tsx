import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '@/components/shared/navigation/PageHeader';
import {
  PlaceList,
  ListToolbar,
  CategoryTabs,
  TopRanking,
  PlanEmptyState,
  PlanTabs,
  PlacesMap,
} from '@/components/feat/places';
import { useTripPlanPage } from '@/hooks/useTripPlanPage';

export default function TripPlanPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const plan = useTripPlanPage(id);

  if (!id) return null;

  const {
    trip,
    places,
    error,
    isLoading,
    currentUserId,
    tab,
    tabs,
    activeMeta,
    activeCat,
    setTab,
    setCat,
    processedPlaces,
    voteListPlaces,
    availableBuckets,
    pickedExternalIds,
    tripCenter,
    memberById,
    hoveredPlaceId,
    setHoveredPlaceId,
    focusCard,
    registerCardRef,
    sortKey,
    setSortKey,
    bulkMode,
    bulkSelected,
    bulkBusy,
    toggleBulkMode,
    toggleBulkSelected,
    handleBulkDelete,
    addError,
    handlePlaceChange,
    handlePlaceRemove,
    handleAddPoi,
  } = plan;

  const hasPlaces = (places?.length ?? 0) > 0;
  const listLoading = isLoading && places === null;

  return (
    <div className="mx-auto flex flex-col gap-6 pb-6 max-w-6xl lg:h-[calc(100dvh-4rem)] lg:overflow-hidden lg:pb-0">
      <div className="shrink-0 space-y-6">
        <PageHeader
          backTo={`/trips/${id}`}
          backLabel={t('overview.tripOverview', 'Trip overview')}
          title={activeMeta.heading}
          subtitle={activeMeta.helper}
        />

        <PlanTabs tabs={tabs} active={tab} onChange={setTab} />

        {(error || addError) && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
            {error?.message ?? addError}
          </div>
        )}

        {tab === 'plan' && hasPlaces && (
          <ListToolbar
            sortKey={sortKey}
            onSortChange={setSortKey}
            bulkMode={bulkMode}
            onToggleBulkMode={toggleBulkMode}
            bulkSelected={bulkSelected}
            onBulkDelete={handleBulkDelete}
            bulkBusy={bulkBusy}
          />
        )}
      </div>

      <div className="flex-1 lg:min-h-0 lg:flex lg:flex-col">
        {tab === 'vote' ? (
          <div className="flex flex-col h-full lg:min-h-0">
            {hasPlaces && (
              <div className="shrink-0 mb-6">
                <CategoryTabs
                  active={activeCat}
                  onChange={setCat}
                  available={availableBuckets}
                  places={places ?? []}
                />
              </div>
            )}
            <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:flex-1 lg:min-h-0">
              <div className="lg:overflow-y-auto px-1 py-1 lg:p-2">
                <PlaceList
                  loading={listLoading}
                  places={voteListPlaces}
                  tripId={id}
                  mode="vote"
                  memberById={memberById}
                  currentUserId={currentUserId}
                  bulkMode={bulkMode}
                  bulkSelected={bulkSelected}
                  onToggleSelect={toggleBulkSelected}
                  onChange={handlePlaceChange}
                  onRemove={handlePlaceRemove}
                  emptyState={<PlanEmptyState tab="vote" onGoToPlan={() => setTab('plan')} />}
                />
              </div>
              <aside className="lg:overflow-y-auto px-1 py-1 lg:p-2 lg:self-start">
                <TopRanking places={places ?? []} activeCat={activeCat} />
              </aside>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 h-full lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:flex-1 lg:min-h-0">
            <aside className="shrink-0 lg:h-full lg:min-h-0">
              <div className="h-[45vh] min-h-[300px] lg:h-full rounded-2xl overflow-hidden border border-border shadow-md ring-1 ring-border/50">
                {/* Wait for the trip (and its centre) before mounting the map,
                    so it opens straight on the destination instead of starting
                    at the Bangkok fallback and panning over. */}
                {trip ? (
                  <PlacesMap
                    places={places ?? []}
                    pickedExternalIds={pickedExternalIds}
                    hoveredId={hoveredPlaceId}
                    onPinClick={focusCard}
                    onPinHover={setHoveredPlaceId}
                    onAddPoi={handleAddPoi}
                    center={tripCenter}
                  />
                ) : (
                  <div className="bg-muted h-full w-full animate-pulse" />
                )}
              </div>
            </aside>
            <div className="lg:overflow-y-auto px-1 py-1 lg:p-2">
              <PlaceList
                loading={listLoading}
                places={processedPlaces}
                tripId={id}
                mode="plan"
                memberById={memberById}
                currentUserId={currentUserId}
                hoveredId={hoveredPlaceId}
                onHover={setHoveredPlaceId}
                bulkMode={bulkMode}
                bulkSelected={bulkSelected}
                onToggleSelect={toggleBulkSelected}
                registerCardRef={registerCardRef}
                onChange={handlePlaceChange}
                onRemove={handlePlaceRemove}
                emptyState={<PlanEmptyState tab="plan" onGoToPlan={() => setTab('plan')} />}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
