import { it, expect } from "vitest";
import { zoomWindow } from "./chartZoom";

it("zooms in around the inspected point and stays inside the data", () => {
  expect(zoomWindow(0, 60, 61, 0.5, 30)).toEqual([15, 45]);
  // Near an edge the window slides in rather than running off the end.
  expect(zoomWindow(0, 60, 61, 0.5, 60)).toEqual([30, 60]);
  expect(zoomWindow(0, 60, 61, 0.5, 0)).toEqual([0, 30]);
});
it("never zooms tighter than the minimum span", () => {
  expect(zoomWindow(10, 13, 61, 0.5, 11)).toEqual([10, 13]);
});
it("zooming out past everything returns to show all", () => {
  expect(zoomWindow(15, 45, 61, 2, 30)).toBeNull();
  expect(zoomWindow(20, 27, 61, 2, 24)).toEqual([16, 31]);
});
