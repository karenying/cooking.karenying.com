import { useState } from "react";
import { ChefHat, Flame, Globe2, Repeat2 } from "lucide-react";
import type { AwayEvent, Meal, Recipe } from "./data";
import { TODAY } from "./data";
import { cookingAnalytics, mealKinds } from "./analytics";
import "./analytics.css";

export function AnalyticsPage({ meals, awayEvents, recipes }: { meals: Meal[]; awayEvents: AwayEvent[]; recipes: Recipe[] }) {
  const [period, setPeriod] = useState("all");
  const currentYear = Number(TODAY.slice(0, 4));
  const firstYear = Math.min(currentYear, ...meals.map(meal => Number(meal.date.slice(0, 4))), ...awayEvents.map(event => Number(event.startDate.slice(0, 4))));
  const years = Array.from({ length: currentYear - firstYear + 1 }, (_, index) => String(currentYear - index));
  const calendarYear = /^\d{4}$/.test(period) ? period : null;
  const start = calendarYear ? `${calendarYear}-01-01` : period === "month" ? `${TODAY.slice(0, 7)}-01` : "0001-01-01";
  const end = calendarYear && Number(calendarYear) < currentYear ? `${calendarYear}-12-31` : TODAY;
  const stats = cookingAnalytics(meals, awayEvents, recipes, start, end);
  const percent = (count: number) => stats.total ? `${Math.round(count / stats.total * 100)}%` : "—";
  const firstDate = [...stats.days.keys()].sort()[0];
  const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const metrics = [
    { icon: ChefHat, value: stats.homeDays, label: "Days with a home meal", note: "Includes leftovers" },
    { icon: Flame, value: stats.longestStreak, label: "Longest home streak", dates: stats.longestStreakDates ? `${formatDate(stats.longestStreakDates.start)} – ${formatDate(stats.longestStreakDates.end)}` : undefined, note: "Consecutive days with a home meal" },
    { icon: Repeat2, value: stats.dishes.length, label: "Distinct dishes", note: "Distinct linked dishes at home" },
    { icon: Globe2, value: stats.cuisines.filter(c => c.name !== "Unspecified").length, label: "Cuisines", note: "From your linked dishes" },
  ];
  return <div className="analytics-page">
    <header className="analytics-heading">
      <div><h1>Analytics</h1></div>
      <label className="analytics-period">Date range<select value={period} onChange={event => setPeriod(event.target.value)}>
        <option value="all">All time</option><option value="month">This month</option>
        {years.map(year => <option key={year} value={year}>{year}</option>)}
      </select></label>
    </header>
    <section className="analytics-card analytics-breakdown" aria-label="Meal breakdown">
      <div className="analytics-card-heading"><div><p className="analytics-date-range">{firstDate ? `${formatDate(firstDate)} – ${formatDate(end)}` : "No meals in this range"}</p></div><span className="analytics-total"><strong>{stats.total}</strong> meals</span></div>
      {stats.total > 0 && <div className="analytics-stack" aria-hidden="true">{mealKinds.map(({ key, color }) => <span key={key} style={{ width: `${stats.counts[key] / stats.total * 100}%`, background: color }}>
        {key === "cooked" && stats.vicCooked > 0 && <span className="analytics-vic-fill" style={{ width: `${Math.min(100, stats.vicCooked / stats.counts.cooked * 100)}%` }} />}
      </span>)}</div>}
      <div className="analytics-table-scroll"><table className="analytics-table">
        <caption className="sr-only">Meal counts and percentages by meal setting</caption>
        <colgroup><col className="analytics-row-label" />{mealKinds.map(({ key }) => <col key={key} />)}<col /></colgroup>
        <thead><tr><th scope="col">Meals</th>{mealKinds.map(({ key, label, color }) => <th scope="col" key={key}><span className="analytics-dot" style={{ background: color }} />{label}</th>)}<th scope="col">Total</th></tr></thead>
        <tbody><tr><th scope="row">Count</th>{mealKinds.map(({ key }) => <td key={key}>{key === "cooked" ? <span className="analytics-cooked-count">{stats.counts[key]}<small className="analytics-vic-count"><span className="analytics-vic-key" aria-hidden="true" />{stats.vicCooked} by Vic</small></span> : stats.counts[key]}</td>)}<td>{stats.total}</td></tr>
          <tr><th scope="row">Share</th>{mealKinds.map(({ key }) => <td key={key}>{percent(stats.counts[key])}</td>)}<td>{stats.total ? "100%" : "—"}</td></tr></tbody>
      </table></div>
    </section>
    {!stats.total && <div className="analytics-empty"><h2>No meals</h2><p>Choose a wider date range or add a meal to the calendar.</p><a className="text-link" href="#/calendar">Open calendar →</a></div>}
    <div className="analytics-metrics">{metrics.map(({ icon: Icon, value, label, dates, note }) => <section className="analytics-card analytics-metric" key={label}><Icon size={20} aria-hidden="true" /><strong>{value}</strong><h2>{label}</h2>{dates && <p className="analytics-streak-dates">{dates}</p>}<p>{note}</p></section>)}</div>
    <div className="analytics-grid">
      <section className="analytics-card" aria-labelledby="rotation-title"><div className="analytics-card-heading"><div><h2 id="rotation-title">Most logged dishes</h2><p>Linked dishes in home meals.</p></div><Repeat2 size={20} aria-hidden="true" /></div>
        {stats.dishes.length ? <ol className="analytics-ranking">{stats.dishes.slice(0, 5).map(({ recipe, count }, index) => <li key={recipe.id}><span className="analytics-rank">{String(index + 1).padStart(2, "0")}</span><a href={`#/recipes/${recipe.id}`}>{recipe.name}<span>{recipe.cuisine || "Unspecified cuisine"}</span></a><strong>{count}<small>{count === 1 ? "meal" : "meals"}</small></strong></li>)}</ol> : <p className="analytics-empty-note">No linked dishes in home meals for this range.</p>}
      </section>
      <section className="analytics-card" aria-labelledby="cuisine-title"><div className="analytics-card-heading"><div><h2 id="cuisine-title">Cuisines</h2><p>Linked dish appearances by cuisine.</p></div><Globe2 size={20} aria-hidden="true" /></div>
        <div className="analytics-cuisines">{stats.cuisines.slice(0, 6).map(({ name, count }) => <div key={name}><div><span>{name}</span><strong>{count} <small>dish {count === 1 ? "appearance" : "appearances"}</small></strong></div><div className="analytics-track" aria-hidden="true"><span style={{ width: `${count / stats.cuisines[0].count * 100}%` }} /></div></div>)}</div>
        {!stats.cuisines.length && <p className="analytics-empty-note">No cuisine data for this range.</p>}
      </section>
    </div>
  </div>;
}
