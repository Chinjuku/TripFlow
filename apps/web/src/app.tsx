import { Button } from '@trip-flow/ui/components/button';
import { TripCard, type Place } from '@/components/trip-card';

const SAMPLE_PLACES: Place[] = [
  {
    id: '1',
    name: 'วัดพระศรีรัตนศาสดาราม (วัดพระแก้ว)',
    address: 'พระบรมมหาราชวัง, ถนนหน้าพระลาน, พระนคร',
    lat: 13.7515,
    lng: 100.4925,
  },
  {
    id: '2',
    name: 'ตลาดนัดจตุจักร',
    address: 'ถนนกำแพงเพชร 2, จตุจักร',
    lat: 13.7998,
    lng: 100.5501,
  },
  {
    id: '3',
    name: 'ICONSIAM',
    address: '299 ถนนเจริญนคร, คลองสาน',
    lat: 13.7264,
    lng: 100.5102,
  },
];

export function App() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">TripFlow</h1>
        <p className="text-muted-foreground text-lg">
          Drag-and-drop trip boards, Google Maps places, and cron-scheduled reminders.
        </p>
      </header>

      <div className="flex gap-3">
        <Button>Create a trip</Button>
        <Button variant="outline">View dashboard</Button>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">ตัวอย่าง trip: Bangkok one-day</h2>
        <div className="flex flex-col gap-3">
          {SAMPLE_PLACES.map((place) => (
            <TripCard key={place.id} place={place} />
          ))}
        </div>
      </section>
    </main>
  );
}
