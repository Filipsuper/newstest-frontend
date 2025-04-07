import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Label, Tooltip, ReferenceLine } from 'recharts';

import { getGraphData } from '../utils/api';
import { BiLoaderAlt } from "react-icons/bi";
import dayjs from "dayjs";
function IndexGraph() {
    const [graphData, setGraphData] = useState([]);
    const [isDataFetched, setIsDataFetched] = useState(false);

    useEffect(() => {

        const fetchGraph = async () => {
            // Check if data is in local storage
            const cachedData = localStorage.getItem('graphData');
            if (cachedData) {
                console.log("Using cached data");

                setGraphData(JSON.parse(cachedData));

                if (dayjs(cachedData[cachedData.length - 1].date).day() !== dayjs().day()) {
                    clearCache()
                    setIsDataFetched(false)
                }
                setIsDataFetched(true);
            } else {
                // If not in cache, fetch from API
                try {
                    const res = await getGraphData();
                    console.log("Fetched new data:", res);
                    setGraphData(res);
                    // Store in local storage
                    localStorage.setItem('graphData', JSON.stringify(res));
                    setIsDataFetched(true);
                } catch (error) {
                    console.error("Error fetching data:", error);
                }
            }
        };

        if (!isDataFetched) {
            fetchGraph();
        }
    }, [isDataFetched]);

    const clearCache = () => {
        localStorage.removeItem('graphData');
        setIsDataFetched(false);
    };

    const renderCandlestick = (props) => {
        const { cx, cy, payload, yAxis } = props;
        const { o, c, h, l } = payload;

        const isGrowing = c > o;
        const color = isGrowing ? "#668CF4" : "#fbbf24";

        // Calculate pixel positions using yAxis scale
        const highY = yAxis.scale(h);
        const lowY = yAxis.scale(l);
        const openY = yAxis.scale(o);
        const closeY = yAxis.scale(c);

        const wickHeight = Math.abs(highY - lowY);
        const bodyHeight = Math.abs(openY - closeY);
        const bodyTop = Math.min(openY, closeY);

        return (
            <g>
                <line
                    x1={cx}
                    y1={highY}
                    x2={cx}
                    y2={lowY}
                    stroke={color}
                    strokeWidth={1}
                />
                <rect
                    x={cx - 3}
                    y={bodyTop}
                    width={6}
                    height={bodyHeight}
                    fill={color}
                    stroke={color}
                />
            </g>
        );
    };

    if (graphData.length === 0) {
        return <div className="animation-spin">...</div>;
    }

    // Calculate the domain for the Y-axis
    const allPrices = graphData.flatMap(d => [d.o, d.c, d.h, d.l]);
    const yDomain = [Math.min(...allPrices), Math.max(...allPrices)];

    const percentageChange = (((yDomain[0] - yDomain[1]) / yDomain[1]) * 100).toFixed(2)

    return (
        <div className="w-full h-40 relative">
            <div className="absolute w-full h-full flex flex-row justify-between text-base text-text-muted">
                <span className=" font-bold">OMX</span>
                <div className="space-x-2">
                    <span className="">30D / 1D</span>
                    <span className={percentageChange > 0 ? "text-primary" : "text-secondary"}>{percentageChange}%</span>
                </div>

            </div>
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart {...{
                    overflow: 'visible'
                }}
                    margin={{ top: 40, right: -10, bottom: 0, left: -10 }}>
                    <XAxis
                        dataKey="date"
                        stroke="#6b7280"
                        name="Date"
                        tickFormatter={
                            (tick) => dayjs(tick).format("DD MMM")
                        }
                        axisLine={false}
                        tickLine={false}
                        minTickGap={30}
                        interval='preserveStartEnd'
                        fontSize={10}
                    />
                    <YAxis
                        type="number"
                        domain={yDomain}
                        name="Price"
                        orientation="right"
                        yAxisId="right"
                        ticks={[yDomain[0].toFixed(2)]}
                        axisLine={false}
                        tickLine={false}
                        stroke="#6b7280"
                        fontSize={10}

                    />
                    <YAxis
                        type="number"
                        domain={yDomain}
                        name="Price"
                        yAxisId="left"
                        orientation="left"
                        ticks={[yDomain[1].toFixed(2)]}
                        axisLine={false}
                        tickLine={false}
                        stroke="#6b7280"
                        fontSize={10}
                    />
                    {/* <Tooltip cursor={{ strokeDasharray: '3 3' }} /> */}
                    <Scatter data={graphData} yAxisId="left" shape={renderCandlestick} />
                </ScatterChart>
            </ResponsiveContainer>
        </div>
    );
}

export default IndexGraph;
