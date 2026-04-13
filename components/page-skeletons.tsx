export function HomeFeedSkeleton() {
  return (
    <div className="content-page home-page">
      <aside className="sidebar-card">
        <div className="skeleton skeleton-line skeleton-line--section" />
        <div className="league-list">
          {Array.from({ length: 7 }).map((_, index) => (
            <div className="league-list__item" key={`league-skeleton-${index}`}>
              <div className="skeleton skeleton-circle" />
              <div className="skeleton skeleton-line skeleton-line--medium" />
            </div>
          ))}
        </div>
      </aside>

      <section className="feed-card">
        <div className="feed-card__header">
          <div className="date-nav">
            <div className="date-nav__header">
              <div className="skeleton skeleton-circle" />
              <div className="date-nav__pills">
                {Array.from({ length: 7 }).map((_, index) => (
                  <div className="skeleton skeleton-pill" key={`date-pill-${index}`} />
                ))}
              </div>
              <div className="skeleton skeleton-circle" />
            </div>
          </div>
        </div>
        <div className="feed-card__content">
          {Array.from({ length: 8 }).map((_, index) => (
            <div className="feed-skeleton-row" key={`feed-row-${index}`}>
              <div className="skeleton skeleton-line skeleton-line--tiny" />
              <div className="feed-skeleton-row__teams">
                <div className="feed-skeleton-row__team">
                  <div className="skeleton skeleton-circle" />
                  <div className="skeleton skeleton-line skeleton-line--medium" />
                </div>
                <div className="skeleton skeleton-line skeleton-line--tiny" />
                <div className="feed-skeleton-row__team">
                  <div className="skeleton skeleton-circle" />
                  <div className="skeleton skeleton-line skeleton-line--medium" />
                </div>
              </div>
              <div className="feed-skeleton-row__energy">
                <div className="skeleton skeleton-bar" />
                <div className="skeleton skeleton-line skeleton-line--tiny" />
                <div className="skeleton skeleton-bar" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="sidebar-card sidebar-card--compact">
        <div className="skeleton skeleton-line skeleton-line--section" />
        <div className="skeleton skeleton-box skeleton-box--story" />
        <div className="skeleton skeleton-line skeleton-line--section" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div className="skeleton-table-row" key={`table-row-${index}`}>
            <div className="skeleton skeleton-line skeleton-line--tiny" />
            <div className="skeleton skeleton-line skeleton-line--medium" />
            <div className="skeleton skeleton-line skeleton-line--tiny" />
          </div>
        ))}
      </aside>
    </div>
  );
}

export function MatchDetailSkeleton() {
  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="match-detail-header">
          <div className="match-detail-side">
            <div className="skeleton skeleton-circle skeleton-circle--xl" />
            <div className="skeleton-stack">
              <div className="skeleton skeleton-line skeleton-line--medium" />
              <div className="skeleton skeleton-line skeleton-line--tiny" />
            </div>
          </div>
          <div className="match-detail-center">
            <div className="skeleton skeleton-line skeleton-line--score" />
            <div className="skeleton skeleton-line skeleton-line--tiny" />
          </div>
          <div className="match-detail-side">
            <div className="skeleton skeleton-circle skeleton-circle--xl" />
            <div className="skeleton-stack">
              <div className="skeleton skeleton-line skeleton-line--medium" />
              <div className="skeleton skeleton-line skeleton-line--tiny" />
            </div>
          </div>
        </div>
        <div className="match-tabs">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="skeleton skeleton-pill skeleton-pill--tab" key={`tab-${index}`} />
          ))}
        </div>
        <div className="sonar-panel">
          <div className="skeleton skeleton-box skeleton-box--hero" />
          <div className="simple-stack">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="skeleton-stat-row" key={`stat-${index}`}>
                <div className="skeleton skeleton-line skeleton-line--tiny" />
                <div className="skeleton skeleton-bar" />
                <div className="skeleton skeleton-line skeleton-line--tiny" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompetitionPageSkeleton() {
  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="league-page-header">
          <div className="skeleton skeleton-circle skeleton-circle--xl" />
          <div className="skeleton-stack">
            <div className="skeleton skeleton-line skeleton-line--medium" />
            <div className="skeleton skeleton-line skeleton-line--tiny" />
          </div>
        </div>
        <div className="match-tabs">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="skeleton skeleton-pill skeleton-pill--tab" key={`league-tab-${index}`} />
          ))}
        </div>
        <div className="sonar-panel">
          <div className="standings-skeleton">
            {Array.from({ length: 10 }).map((_, index) => (
              <div className="standings-skeleton__row" key={`standing-${index}`}>
                <div className="skeleton skeleton-line skeleton-line--tiny" />
                <div className="skeleton skeleton-circle" />
                <div className="skeleton skeleton-line skeleton-line--medium" />
                {Array.from({ length: 6 }).map((__, statIndex) => (
                  <div className="skeleton skeleton-line skeleton-line--tiny" key={`stat-${index}-${statIndex}`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EntityPageSkeleton() {
  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="entity-skeleton-header">
          <div className="skeleton skeleton-circle skeleton-circle--xxl" />
          <div className="skeleton-stack">
            <div className="skeleton skeleton-line skeleton-line--medium" />
            <div className="skeleton skeleton-line skeleton-line--tiny" />
          </div>
          <div className="skeleton skeleton-box skeleton-box--stat" />
        </div>
        <div className="match-tabs">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="skeleton skeleton-pill skeleton-pill--tab" key={`entity-tab-${index}`} />
          ))}
        </div>
        <div className="sonar-panel">
          <div className="summary-metric-grid summary-metric-grid--three">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="skeleton skeleton-box skeleton-box--metric" key={`metric-${index}`} />
            ))}
          </div>
          <div className="entity-skeleton-grid">
            <div className="skeleton skeleton-box skeleton-box--panel" />
            <div className="skeleton skeleton-box skeleton-box--panel" />
          </div>
        </div>
      </div>
    </div>
  );
}
