import { useState, useEffect } from "react";

export default function AnalyticsCharts({ data }) {
  const [hoveredDot, setHoveredDot] = useState(null);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Trigger entrance animation for charts/bars
    const timer = setTimeout(() => setAnimate(true), 50);
    return () => clearTimeout(timer);
  }, [data.shortCode]);

  if (!data) return null;

  const { devices = [], browsers = [], os = [], referrers = [], timeline = [], totalClicks = 0 } = data;

  // 📈 Generate complete last 7 days for click timeline
  const getCompleteTimeline = () => {
    const dates = [];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      dates.push({
        iso: `${yyyy}-${mm}-${dd}`,
        label: `${monthNames[d.getMonth()]} ${d.getDate()}`
      });
    }

    const timelineMap = {};
    timeline.forEach(item => {
      let key = item.click_date;
      if (key && key.includes('T')) {
        key = key.split('T')[0];
      }
      timelineMap[key] = parseInt(item.count) || 0;
    });

    return dates.map(day => ({
      label: day.label,
      count: timelineMap[day.iso] || 0
    }));
  };

  const completedTimeline = getCompleteTimeline();

  // SVG Area/Line Chart coordinates configuration
  const svgWidth = 600;
  const svgHeight = 220;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Max value calculation for Y-Axis
  const maxTimelineVal = Math.max(...completedTimeline.map(d => d.count), 0);
  const yAxisMax = maxTimelineVal > 0 ? Math.ceil(maxTimelineVal * 1.2) : 5;

  // Map data to x, y coordinates
  const points = completedTimeline.map((d, index) => {
    const x = paddingLeft + (index * (chartWidth / 6));
    const y = paddingTop + chartHeight - ((d.count / yAxisMax) * chartHeight);
    return { x, y, count: d.count, label: d.label };
  });

  // SVG Path strings
  let linePath = "";
  let areaPath = "";

  if (points.length > 0) {
    // Construct line path
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
    
    // Construct closed area path for gradient fill
    areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  // Percentage calculations helper
  const getPercentage = (count) => {
    if (totalClicks === 0) return 0;
    return Math.round((count / totalClicks) * 100);
  };

  // Device Icons mapper
  const getDeviceIcon = (device) => {
    const d = device.toLowerCase();
    if (d === "mobile") return "📱";
    if (d === "tablet") return "📟";
    return "💻";
  };

  return (
    <div className="analytics-details-container">
      {/* 🚀 SVG Timeline Line/Area Chart Card */}
      <div className="analytics-card chart-card full-width">
        <h3 className="card-title">📈 Click History (Last 7 Days)</h3>
        {totalClicks === 0 ? (
          <div className="no-data-placeholder">No visits recorded in the last 7 days.</div>
        ) : (
          <div className="chart-wrapper">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="timeline-svg">
              <defs>
                {/* Glow & Gradient Fills */}
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = paddingTop + chartHeight * ratio;
                const value = Math.round(yAxisMax * (1 - ratio));
                return (
                  <g key={idx}>
                    <line 
                      x1={paddingLeft} 
                      y1={y} 
                      x2={svgWidth - paddingRight} 
                      y2={y} 
                      stroke="rgba(255,255,255,0.06)" 
                      strokeDasharray="4,4" 
                    />
                    <text 
                      x={paddingLeft - 10} 
                      y={y + 4} 
                      fill="var(--text-secondary)" 
                      fontSize="10" 
                      textAnchor="end"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {/* Chart Paths */}
              {animate && points.length > 0 && (
                <>
                  <path 
                    d={areaPath} 
                    fill="url(#chartAreaGradient)" 
                    className="chart-area-path"
                  />
                  <path 
                    d={linePath} 
                    fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="3.5" 
                    strokeLinecap="round"
                    filter="url(#glow)"
                    className="chart-line-path"
                  />
                </>
              )}

              {/* Interactive Dots on Hover */}
              {points.map((p, idx) => (
                <circle
                  key={idx}
                  cx={p.x}
                  cy={p.y}
                  r={hoveredDot === idx ? 8 : 4.5}
                  fill={hoveredDot === idx ? "var(--primary-hover)" : "var(--primary)"}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                  onMouseEnter={() => setHoveredDot(idx)}
                  onMouseLeave={() => setHoveredDot(null)}
                  style={{ cursor: "pointer", transition: "all 0.2s ease" }}
                />
              ))}

              {/* X-Axis labels */}
              {points.map((p, idx) => (
                <text
                  key={idx}
                  x={p.x}
                  y={paddingTop + chartHeight + 22}
                  fill="var(--text-secondary)"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {p.label}
                </text>
              ))}

              {/* Tooltip Overlay */}
              {hoveredDot !== null && (
                <g>
                  {/* Tooltip background card */}
                  <rect
                    x={Math.min(Math.max(points[hoveredDot].x - 60, 10), svgWidth - 130)}
                    y={Math.max(points[hoveredDot].y - 45, 10)}
                    width="120"
                    height="32"
                    rx="8"
                    fill="rgba(15, 23, 42, 0.95)"
                    stroke="rgba(99, 102, 241, 0.4)"
                    strokeWidth="1"
                  />
                  <text
                    x={Math.min(Math.max(points[hoveredDot].x, 70), svgWidth - 70)}
                    y={Math.max(points[hoveredDot].y - 25, 30)}
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {points[hoveredDot].count} clicks ({points[hoveredDot].label})
                  </text>
                </g>
              )}
            </svg>
          </div>
        )}
      </div>

      <div className="analytics-grid-distribution">
        {/* 📱 Devices Card */}
        <div className="analytics-card">
          <h3 className="card-title">📱 Devices</h3>
          {devices.length === 0 ? (
            <div className="no-data-placeholder">No device data available.</div>
          ) : (
            <div className="distribution-list">
              {devices.map((item, idx) => {
                const pct = getPercentage(item.count);
                return (
                  <div key={idx} className="distribution-row">
                    <div className="row-header">
                      <span className="row-name">
                        <span style={{ marginRight: "8px" }}>{getDeviceIcon(item.device)}</span>
                        {item.device}
                      </span>
                      <span className="row-val">{item.count} ({pct}%)</span>
                    </div>
                    <div className="progress-track">
                      <div 
                        className="progress-fill device-fill" 
                        style={{ width: animate ? `${pct}%` : "0%" }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🌐 Browsers Card */}
        <div className="analytics-card">
          <h3 className="card-title">🌐 Top Browsers</h3>
          {browsers.length === 0 ? (
            <div className="no-data-placeholder">No browser data available.</div>
          ) : (
            <div className="distribution-list">
              {browsers.map((item, idx) => {
                const pct = getPercentage(item.count);
                return (
                  <div key={idx} className="distribution-row">
                    <div className="row-header">
                      <span className="row-name">{item.browser}</span>
                      <span className="row-val">{item.count} ({pct}%)</span>
                    </div>
                    <div className="progress-track">
                      <div 
                        className="progress-fill browser-fill" 
                        style={{ width: animate ? `${pct}%` : "0%" }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ⚙️ Operating Systems Card */}
        <div className="analytics-card">
          <h3 className="card-title">💻 Operating Systems</h3>
          {os.length === 0 ? (
            <div className="no-data-placeholder">No OS data available.</div>
          ) : (
            <div className="distribution-list">
              {os.map((item, idx) => {
                const pct = getPercentage(item.count);
                return (
                  <div key={idx} className="distribution-row">
                    <div className="row-header">
                      <span className="row-name">{item.os}</span>
                      <span className="row-val">{item.count} ({pct}%)</span>
                    </div>
                    <div className="progress-track">
                      <div 
                        className="progress-fill os-fill" 
                        style={{ width: animate ? `${pct}%` : "0%" }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 🔗 Referrers Card */}
        <div className="analytics-card">
          <h3 className="card-title">🔗 Traffic Referrers</h3>
          {referrers.length === 0 ? (
            <div className="no-data-placeholder">No referrer data available.</div>
          ) : (
            <div className="distribution-list">
              {referrers.map((item, idx) => {
                const pct = getPercentage(item.count);
                let referrerDisplay = item.referrer;
                if (referrerDisplay !== "Direct") {
                  try {
                    const url = new URL(referrerDisplay);
                    referrerDisplay = url.hostname;
                  } catch (e) {
                    // fall back to raw string
                  }
                }
                return (
                  <div key={idx} className="distribution-row">
                    <div className="row-header">
                      <span 
                        className="row-name" 
                        title={item.referrer}
                        style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "200px" }}
                      >
                        {referrerDisplay}
                      </span>
                      <span className="row-val">{item.count} ({pct}%)</span>
                    </div>
                    <div className="progress-track">
                      <div 
                        className="progress-fill referrer-fill" 
                        style={{ width: animate ? `${pct}%` : "0%" }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
