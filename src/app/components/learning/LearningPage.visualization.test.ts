import { describe, expect, it } from "@jest/globals";
import { parseLearningChartJsConfig } from "./LearningPage";

describe("parseLearningChartJsConfig", () => {
  it("extracts chart data from common Chart.js object literals without eval", () => {
    const config = `
      const config = {
        type: 'line',
        data: {
          labels: ['Week 1', 'Week 2', 'Week 3'],
          datasets: [
            {
              label: 'Retention',
              data: [62, 71, 83],
              borderColor: '#2f7d68',
              backgroundColor: ['#d7efe7', '#bde5d8', '#8fd1bc'],
            },
          ],
        },
        options: {
          plugins: {
            tooltip: {
              callbacks: {
                label(context) {
                  return context.raw + '%';
                },
              },
            },
          },
        },
      };
    `;

    const parsed = parseLearningChartJsConfig(config);

    expect(parsed.type).toBe("line");
    expect(parsed.data).toMatchObject({
      labels: ["Week 1", "Week 2", "Week 3"],
      datasets: [
        {
          label: "Retention",
          data: [62, 71, 83],
        },
      ],
    });
  });
});
