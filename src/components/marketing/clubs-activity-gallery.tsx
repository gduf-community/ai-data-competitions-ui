import type { ClubRecord } from "@/lib/data/clubs";

interface ClubsActivityGalleryProps {
  clubs: ClubRecord[];
}

export function ClubsActivityGallery({ clubs }: ClubsActivityGalleryProps) {
  return (
    <section id="clubs-activities" className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="mb-8 space-y-3">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            年度活动
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            社团训练与公开活动
          </h2>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          {clubs.map((club) =>
            club.flagshipActivities.map((activity) => (
              <article
                key={activity.id}
                className="glass-3 rounded-xl border border-border/50 p-5"
              >
                <p className="text-xs text-muted-foreground">{club.shortName}</p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  {activity.title}
                </h3>
                <p className="mt-1 text-sm text-primary">{activity.when}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {activity.note}
                </p>
              </article>
            )),
          )}
        </div>
      </div>
    </section>
  );
}
