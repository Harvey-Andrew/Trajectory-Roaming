/**
 * @FilePath     : /Trajectory Roaming/src/tool/trajectory.js
 * @Description  : 计算结束时间
 * @Author       : Harvey-Andrew
 * @Version      : 0.0.1
 * @LastEditors  : Harvey-Andrew 
 * @LastEditTime : 2024-07-02 23:25:52
 * @Copyright © 2024 by Harvey-Andrew.
 */

import * as Cesium from "cesium";

const getSiteTimes = (pArr, speed) => {
  let timeSum = 0,
    times = []; //timeSum花费时间总和,每一个轨迹点对应的时间
  for (let i = 0; i < pArr.length; i++) {
    if (i == 0) {
      times.push(0);
      continue;
    }
    // 计算时间总数
    timeSum += spaceDistance(pArr[i - 1], pArr[i]) / speed;
    // 每个轨迹点所对应的系统时间
    times.push(timeSum);

  }
  return { timeSum: timeSum, siteTime: times };
};

// 计算两点的距离
const spaceDistance = (a, b) => {
  return Cesium.Cartesian3.distance(a, b).toFixed(2);
};

const getSampleData = (pArr, start, siteTime) => {
  const position = new Cesium.SampledPositionProperty();
  for (let i = 0; i < pArr.length; i++) {
    //每一个轨迹点所对应的系统时间
    const time = Cesium.JulianDate.addSeconds(
      start,
      siteTime[i],
      new Cesium.JulianDate()
    );
    position.addSample(time, pArr[i]);
  }
  return position;
};

export { getSiteTimes, getSampleData, spaceDistance };
