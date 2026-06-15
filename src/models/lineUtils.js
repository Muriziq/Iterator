import { canvas, ctx, canvass, canvassDiv, propertiesBar, notification, editclip, width, height, saveWorker, measurementArr, db, projectName, thresholds, generationArea } from "../constants.js";
import { objectProperties } from "../variable.js";
import { adapt } from "../state/canvas.js";

export default class LineUtils {
  static getEdgeAtPosition(localMouseX, localMouseY, points) {
    let threshold = thresholds.threshold();
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];

      const p1 = current.points;
      const p2 = next.points;

      if (current.edgeModes === "shaped") {
        const cp1 = current.controls[0];
        const cp2 = current.controls[1];

        const steps = 50;
        let prev = this.computeBezierPoint(p1, cp1, cp2, p2, 0);

        for (let t = 1; t <= steps; t++) {
          const tNorm = t / steps;
          const curr = this.computeBezierPoint(p1, cp1, cp2, p2, tNorm);
          const dist = this.pointLineDistance(
            localMouseX,
            localMouseY,
            prev.x,
            prev.y,
            curr.x,
            curr.y,
          );
          if (dist < threshold) return { value: i, type: "lineIndex" };
          prev = curr;
        }
      } else {
        const dist = this.pointLineDistance(
          localMouseX,
          localMouseY,
          p1.x,
          p1.y,
          p2.x,
          p2.y,
        );
        if (dist <= threshold) return { value: i, type: "lineIndex" };
      }
    }
    return false;
  }
  static getPointPositon(localMouseX, localMouseY, points) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i].points;
      const pdx = localMouseX - p.x;
      const pdy = localMouseY - p.y;
      if (
        pdx * pdx + pdy * pdy <
        thresholds.pointHold() * thresholds.pointHold()
      ) {
        return { value: i, type: "pointIndex" };
      }
    }

    for (let i = 0; i < points.length; i++) {
      if (points[i].edgeModes === "shaped") {
        for (let j = 0; j < 2; j++) {
          const cp = points[i].controls[j];
          const cdx = localMouseX - cp.x;
          const cdy = localMouseY - cp.y;
          if (
            cdx * cdx + cdy * cdy <
            thresholds.pointHold() * thresholds.pointHold()
          ) {
            return {
              value: { curveIndex: i, controlIndex: j },
              type: "curveIndex",
            };
          }
        }
      }
    }

    return false;
  }

  /**
   * Computes per-corner radii scaled down so no two adjacent corners
   * overflow their shared segment. Iterates a few times to let constraints
   * propagate when multiple segments are short.
   *
   * @param {Array} points  - the points array
   * @param {Function} getRadius - (point, index) => desired radius (0 for non-rounded corners)
   * @returns {number[]} safe radius for each corner
   */
  static computeSafeRadii(points, getRadius) {
    const n = points.length;
    const radii = points.map((p, i) => getRadius(p, i));

    for (let iter = 0; iter < 3; iter++) {
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n;
        const a = points[i].points;
        const b = points[next].points;
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        const total = radii[i] + radii[next];
        if (total > segLen && total > 0) {
          const scale = segLen / total;
          radii[i] *= scale;
          radii[next] *= scale;
        }
      }
    }
    return radii;
  }

  static drawRoundedShape(points, radius) {
    if (points.length < 2) return;

    const safeRadii = this.computeSafeRadii(points, () => radius);

    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const prev = points[(i - 1 + points.length) % points.length].points;
      const curr = points[i].points;
      const next = points[(i + 1) % points.length].points;

      const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
      const len1 = Math.hypot(v1.x, v1.y);
      v1.x /= len1;
      v1.y /= len1;
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };
      const len2 = Math.hypot(v2.x, v2.y);
      v2.x /= len2;
      v2.y /= len2;

      const r = safeRadii[i];
      const p1 = {
        x: curr.x - v1.x * r,
        y: curr.y - v1.y * r,
      };
      const p2 = {
        x: curr.x + v2.x * r,
        y: curr.y + v2.y * r,
      };

      if (i === 0) {
        ctx.moveTo(p1.x, p1.y);
      } else {
        ctx.lineTo(p1.x, p1.y);
      }

      ctx.arcTo(curr.x, curr.y, p2.x, p2.y, r);
    }
    ctx.closePath();
  }

  static drawSmartShape(points, close = true) {
    if (points.length < 2) return;

    const safeRadii = this.computeSafeRadii(
      points,
      (p) => (p.edgeModes === "rounded" ? p.cornerRadius : 0),
    );

    ctx.beginPath();

    for (let i = 0; i < points.length; i++) {
      const curr = points[i].points;
      const prevIdx = (i - 1 + points.length) % points.length;
      const nextIdx = (i + 1) % points.length;
      const prev = points[prevIdx].points;
      const next = points[nextIdx].points;
      const mode = points[i].edgeModes;
      if (mode === "rounded") {
        const v1 = { x: curr.x - prev.x, y: curr.y - prev.y };
        const len1 = Math.hypot(v1.x, v1.y);
        v1.x /= len1;
        v1.y /= len1;
        const v2 = { x: next.x - curr.x, y: next.y - curr.y };
        const len2 = Math.hypot(v2.x, v2.y);
        v2.x /= len2;
        v2.y /= len2;

        const r = safeRadii[i];
        const p1 = {
          x: curr.x - v1.x * r,
          y: curr.y - v1.y * r,
        };
        const p2 = {
          x: curr.x + v2.x * r,
          y: curr.y + v2.y * r,
        };

        if (i === 0) {
          ctx.moveTo(p1.x, p1.y);
        } else {
          const prevPoint = points[prevIdx];
          if (prevPoint.edgeModes && prevPoint.controls) {
            const cp1 = prevPoint.controls[0];
            const cp2 = prevPoint.controls[1];
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p1.x, p1.y);
          } else {
            ctx.lineTo(p1.x, p1.y);
          }
        }

        ctx.arcTo(curr.x, curr.y, p2.x, p2.y, r);
      } else {
        if (i === 0) {
          ctx.moveTo(curr.x, curr.y);
        } else {
          const prevPoint = points[prevIdx];
          if (prevPoint.edgeModes === "shaped") {
            const cp1 = prevPoint.controls[0];
            const cp2 = prevPoint.controls[1];
            ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, curr.x, curr.y);
          } else {
            ctx.lineTo(curr.x, curr.y);
          }
        }
      }
    }
    if (close) {
      const last = points[points.length - 1];
      const first = points[0];
      if (last.edgeModes === "shaped") {
        const cp1 = last.controls[0];
        const cp2 = last.controls[1];
        ctx.bezierCurveTo(
          cp1.x,
          cp1.y,
          cp2.x,
          cp2.y,
          first.points.x,
          first.points.y,
        );
      } else {
        ctx.lineTo(first.points.x, first.points.y);
      }
      ctx.closePath();
    }
  }

  static drawEditArcs(points, selectedArea, selectedLineIndex) {
    points.forEach((p, i) => {
      ctx.beginPath();
      ctx.rect(
        p.points.x - thresholds.pointHold() / 2,
        p.points.y - thresholds.pointHold() / 2,
        thresholds.pointHold(),
        thresholds.pointHold(),
      );

      if (selectedArea === "pointIndex" && i === selectedLineIndex)
        ctx.fillStyle = "#0000ff";
      else ctx.fillStyle = "#0000ff88";
      ctx.strokeStyle = "#e4e4e4";
      ctx.fill();
      ctx.lineWidth = adapt(2);
      ctx.stroke();
    });

    points.forEach((isCurve, i) => {
      if (isCurve.edgeModes === "shaped") {
        isCurve.controls.forEach((cp, j) => {
          ctx.beginPath();
          ctx.moveTo(isCurve.points.x, isCurve.points.y);
          ctx.lineTo(cp.x, cp.y);
          ctx.strokeStyle = "#0000ff88";
          ctx.lineWidth = adapt(2);
          ctx.stroke();
          ctx.beginPath();
          ctx.rect(
            cp.x - thresholds.pointHold() / 2,
            cp.y - thresholds.pointHold() / 2,
            thresholds.pointHold(),
            thresholds.pointHold(),
          );
          const isSelected =
            selectedArea === "curveIndex" &&
            selectedLineIndex.curveIndex === i &&
            selectedLineIndex.controlIndex === j;
          ctx.fillStyle = isSelected ? "#00ff00" : "#00ff0088";
          ctx.fill();
          ctx.stroke();
        });
      }
    });
  }
  static getNormalPostion(localX, localY, width, height, threshold) {
    let selectedArea = null;
    const nearLeft = Math.abs(localX) < threshold;
    const nearRight = Math.abs(localX - width) < threshold;
    const nearTop = Math.abs(localY) < threshold;
    const nearBottom = Math.abs(localY - height) < threshold;
    if (nearLeft && nearTop) selectedArea = "TopLeft";
    else if (nearRight && nearTop) selectedArea = "TopRight";
    else if (nearLeft && nearBottom) selectedArea = "BottomLeft";
    else if (nearRight && nearBottom) selectedArea = "BottomRight";
    else if (nearLeft) selectedArea = "Left";
    else if (nearRight) selectedArea = "Right";
    else if (nearTop) selectedArea = "Top";
    else if (nearBottom) selectedArea = "Bottom";
    else if (localX > 0 && localX < width && localY > 0 && localY < height) {
      selectedArea = "Selected";
    }
    return selectedArea;
  }
  static pointLineDistance(px, py, x1, y1, x2, y2) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }
  static computeBezierPoint(p0, p1, p2, p3, t) {
    const x =
      Math.pow(1 - t, 3) * p0.x +
      3 * Math.pow(1 - t, 2) * t * p1.x +
      3 * (1 - t) * Math.pow(t, 2) * p2.x +
      Math.pow(t, 3) * p3.x;

    const y =
      Math.pow(1 - t, 3) * p0.y +
      3 * Math.pow(1 - t, 2) * t * p1.y +
      3 * (1 - t) * Math.pow(t, 2) * p2.y +
      Math.pow(t, 3) * p3.y;

    return { x, y };
  }
}