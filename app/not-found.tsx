import Link from "next/link";

export default function NotFound() {
  return (
    <div className="content-page">
      <div className="match-detail-mock">
        <div className="page-block-header">
          <div className="page-block-header__title">Sonar signal not found</div>
          <div className="page-block-header__meta">
            你打开的页面还没有对应数据，可以先回到首页继续看比赛流。
          </div>
        </div>
        <div className="sonar-panel">
          <Link href="/" className="theme-toggle">
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
