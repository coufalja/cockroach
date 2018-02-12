import d3 from "d3";
import React from "react";

import { NanoToMilli } from "src/util/convert";
import { Metric, MetricsDataComponentProps } from "src/views/shared/components/metricQuery";
import { MetricsDataProvider } from "src/views/shared/containers/metricDataProvider";
import createChartComponent from "src/views/shared/util/d3-react";

interface SparklineConfig {
  width: number;
  height: number;
  backgroundColor: string;
  lineColor: string;
}

interface Datapoint {
  timestamp: number;
  value: number;
}

interface SparklineChartProps {
  results: Datapoint[];
}

function sparklineChart(config: SparklineConfig) {
  const { width, height, backgroundColor, lineColor } = config;
  const margin = {
    left: 1,
    top: 1,
    right: 1,
    bottom: 1,
  };

  const xScale = d3.scale.linear()
    .range([margin.left, width - margin.right]);
  const yScale = d3.scale.linear()
    .range([height - margin.bottom, margin.top]);

  const drawPath = d3.svg.line<Datapoint>()
    .x((d: Datapoint) => xScale(d.timestamp))
    .y((d: Datapoint) => yScale(d.value));

  return function renderSparkline(sel: d3.Selection<SparklineChartProps>) {
    // TODO(couchand): unsingletonize this
    const { results } = sel.datum();

    xScale.domain(d3.extent(results, (d: Datapoint) => d.timestamp));
    yScale.domain(d3.extent(results, (d: Datapoint) => d.value));

    const bg = sel.selectAll("rect")
      .data([null]);

    bg
      .enter()
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", backgroundColor)
      .attr("fill-opacity", 1)
      .attr("stroke", "none");

    const line = sel.selectAll("path")
      .data([results]);

    line
      .enter()
      .append("path")
      .attr("fill", "none")
      .attr("stroke", lineColor);

    line
      .attr("d", drawPath);
  };
}

class SparklineMetricsDataComponent extends React.Component<MetricsDataComponentProps> {
  chart: React.ComponentClass<SparklineChartProps>;

  constructor(props: MetricsDataComponentProps) {
    super(props);

    this.chart = createChartComponent(
      "g",
      // TODO(couchand): dedupe this with the constants in statsView
      sparklineChart({
        width: 69,
        height: 10,
        backgroundColor: "#B8CCEC",
        lineColor: "#3A7DE1",
      }),
    );
  }

  render() {
    const { data } = this.props;
    if (!data || !data.results || !data.results.length) {
      return null;
    }

    const timestamps: number[] = [];
    const resultsByTimestamp: { [timestamp: string]: Datapoint } = {};

    data.results.forEach(({ datapoints }) => {
      datapoints
        .forEach(({ timestamp_nanos, value }) => {
          const timestamp = NanoToMilli(timestamp_nanos.toNumber());

          if (timestamps.indexOf(timestamp) !== -1) {
            resultsByTimestamp[timestamp].value += value;
          } else {
            resultsByTimestamp[timestamp] = { timestamp, value };
            timestamps.push(timestamp);
          }
        });
    });

    const results = timestamps.map((timestamp) => resultsByTimestamp[timestamp]);

    // tslint:disable-next-line:variable-name
    const Sparkline = this.chart;

    return <Sparkline results={results} />;
  }
}

interface QpsSparklineProps {
  nodes: string[];
}

export function QpsSparkline(props: QpsSparklineProps) {
  const key = "sparkline.qps.nodes." + props.nodes.join("-");

  return (
    <MetricsDataProvider id={key}>
      <SparklineMetricsDataComponent>
        <Metric name="cr.node.sql.select.count" sources={props.nodes} nonNegativeRate />
        <Metric name="cr.node.sql.insert.count" sources={props.nodes} nonNegativeRate />
        <Metric name="cr.node.sql.update.count" sources={props.nodes} nonNegativeRate />
        <Metric name="cr.node.sql.delete.count" sources={props.nodes} nonNegativeRate />
      </SparklineMetricsDataComponent>
    </MetricsDataProvider>
  );
}
