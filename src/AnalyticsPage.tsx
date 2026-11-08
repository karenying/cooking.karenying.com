import { useState } from "react";
import { ChefHat, Flame, Globe2, Repeat2 } from "lucide-react";
import type { AwayEvent, Meal, Recipe } from "./data";
import { TODAY } from "./data";
import { cookingAnalytics, dayKinds } from "./analytics";
import "./analytics.css";

export function AnalyticsPage({ meals, awayEvents, recipes }: { meals: Meal[]; awayEvents: AwayEvent[]; recipes: Recipe[] }) {
  const [period, setPeriod] = useState("all");
  const start = period === "month" ? `${TODAY.slice(0, 7)}-01` : period === "year" ? `${TODAY.slice(0, 4)}-01-01` : "0001-01-01";
  const stats = cookingAnalytics(meals, awayEvents, recipes, start, TODAY);
  const percent = (count: number) => stats.total ? `${Math.round(count / stats.total * 100)}%` : "—";
  const firstDate = [...stats.days.keys()].sort()[0];
  const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const metrics = [
    { icon: ChefHat, value: stats.counts.cooked + stats.counts.mix, label: "Days with a home meal", note: "Cooked + mixed days" },
    { icon: Flame, value: stats.longestStreak, label: "Longest home streak", note: "Consecutive days with a home meal" },
    { icon: Repeat2, value: stats.dishes.length, label: "Distinct dishes", note: "Distinct linked dishes at home" },
    { icon: Globe2, value: stats.cuisines.filter(c => c.name !== "Unspecified").length, label: "Cuisines", note: "From your linked dishes" },
  ];
  return <div className="analytics-page">
    <header className="analytics-heading">
      <div><h1>Analytics</h1></div>
      <label className="analytics-period">Date range<select value={period} onChange={event => setPeriod(event.target.value)}>
        <option value="all">All time</option><option value="year">This year</option><option value="month">This month</option>
      </select></label>
    </header>
    <section className="analytics-card analytics-breakdown" aria-labelledby="breakdown-title">
      <div className="analytics-card-heading"><div><h2 id="breakdown-title">How we ate</h2><p>{firstDate ? `${formatDate(firstDate)} – ${formatDate(TODAY)}` : "No recorded days in this range"}</p></div><span className="analytics-total"><strong>{stats.total}</strong> recorded days</span></div>
      {stats.total > 0 && <div className="analytics-stack" aria-hidden="true">{dayKinds.map(({ key, color }) => <span key={key} style={{ width: `${stats.counts[key] / stats.total * 100}%`, background: color }} />)}</div>}
      <div className="analytics-table-scroll"><table className="analytics-table">
        <caption className="sr-only">Day counts and percentages by meal setting</caption>
        <thead><tr><th scope="col">Days</th>{dayKinds.map(({ key, label, color }) => <th scope="col" key={key}><span className="analytics-dot" style={{ background: color }} />{label}</th>)}<th scope="col">Total</th></tr></thead>
        <tbody><tr><th scope="row">Count</th>{dayKinds.map(({ key }) => <td key={key}>{stats.counts[key]}</td>)}<td>{stats.total}</td></tr>
          <tr><th scope="row">Share</th>{dayKinds.map(({ key }) => <td key={key}>{percent(stats.counts[key])}</td>)}<td>{stats.total ? "100%" : "—"}</td></tr></tbody>
      </table></div>
      <div className="analytics-actual"><div><strong>Actual split</strong><span>Mixed days count half toward each.</span></div>
        <div><span>Cooked</span><strong>{percent(stats.actual.cooked)}</strong></div><div><span>Ate out</span><strong>{percent(stats.actual.out)}</strong></div><div><span>Away</span><strong>{percent(stats.actual.away)}</strong></div>
      </div>
      <details className="analytics-method"><summary>How these numbers work</summary><p>Each recorded date counts once. Home + eating out makes a mixed day; away events take priority, including both end dates. Overlapping trips count once. Figma lunches are excluded; a day with only Figma is left out. Missing dates and future plans are excluded. “Cooked” uses the At home setting, which can include leftovers. Percentages are rounded.</p><p>Your spreadsheet reference had 439 cooked, 28 ate out, 134 mix and 242 away days (843 total), giving an actual split of 60% / 11% / 29%. This page recalculates from the calendar, so totals may differ from that snapshot.</p></details>
    </section>
    {!stats.total && <div className="analytics-empty"><h2>No recorded days</h2><p>Choose a wider date range or add a meal to the calendar.</p><a className="text-link" href="#/calendar">Open calendar →</a></div>}
    <div className="analytics-metrics">{metrics.map(({ icon: Icon, value, label, note }) => <section className="analytics-card analytics-metric" key={label}><Icon size={20} aria-hidden="true" /><strong>{value}</strong><h2>{label}</h2><p>{note}</p></section>)}</div>
    <div className="analytics-grid">
      <section className="analytics-card" aria-labelledby="rotation-title"><div className="analytics-card-heading"><div><h2 id="rotation-title">Most logged dishes</h2><p>Linked dishes in home meals.</p></div><Repeat2 size={20} aria-hidden="true" /></div>
        {stats.dishes.length ? <ol className="analytics-ranking">{stats.dishes.slice(0, 5).map(({ recipe, count }, index) => <li key={recipe.id}><span className="analytics-rank">{String(index + 1).padStart(2, "0")}</span><a href={`#/recipes/${recipe.id}`}>{recipe.name}<span>{recipe.cuisine || "Unspecified cuisine"}</span></a><strong>{count}<small>{count === 1 ? "meal" : "meals"}</small></strong></li>)}</ol> : <p className="analytics-empty-note">No linked dishes in home meals for this range.</p>}
      </section>
      <section className="analytics-card" aria-labelledby="cuisine-title"><div className="analytics-card-heading"><div><h2 id="cuisine-title">Cuisines</h2><p>Linked dish appearances by cuisine.</p></div><Globe2 size={20} aria-hidden="true" /></div>
        <div className="analytics-cuisines">{stats.cuisines.slice(0, 6).map(({ name, count }) => <div key={name}><div><span>{name}</span><strong>{count} <small>dish {count === 1 ? "appearance" : "appearances"}</small></strong></div><div className="analytics-track" aria-hidden="true"><span style={{ width: `${count / stats.cuisines[0].count * 100}%` }} /></div></div>)}</div>
        {!stats.cuisines.length && <p className="analytics-empty-note">No cuisine data for this range.</p>}
      </section>
    </div>
    <p className="analytics-footnote">Dish rankings and cuisines count linked dishes in home meals, excluding away dates. Unlinked meal text is included in day totals only. A home meal is a record of eating at home, not proof of cooking from scratch.</p>
  </div>;
}
