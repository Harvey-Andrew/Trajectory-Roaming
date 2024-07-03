<!--
 * @FilePath     : /Trajectory Roaming/src/App.vue
 * @Description  : 公交车轨迹漫游
 * @Author       : Harvey-Andrew
 * @Version      : 0.0.1
 * @LastEditors  : Harvey-Andrew 
 * @LastEditTime : 2024-07-03 11:42:14
 * Copyright © 2024 by Harvey-Andrew.
-->

<template>
  <!-- 站点==>下一站点 -->
  <div class="fromTo">
    <div>{{ data.fromName }}</div>
    <img src="/src/assets/jt.png" alt="" />
    <div>{{ data.toName }}</div>
  </div>

  <!-- 站点牌 -->
  <div class="carInfo">
    <img ref="img" class="img" src="/src/assets/icon.png" alt="" />
    <div
      class="itemStation"
      :style="{ color: index == data.index ? '#f7bd42' : '' }"
      v-for="(item, index) in data.carInfo.stations"
      :key="index"
      @click="toStation(index)"
    >
      <span class="num">{{ index + 1 }}</span
      >{{ item.name }}
    </div>
  </div>

  <!-- 控制器 -->
  <div class="control">
    <div class="iconList">
      <el-icon
        title="暂停"
        @click="toAdjust('pause')"
        v-show="data.control.play"
        ><VideoPause
      /></el-icon>
      <el-icon
        title="播放"
        @click="toAdjust('play')"
        v-show="!data.control.play"
        ><VideoPlay
      /></el-icon>
      <el-icon
        :style="{ color: data.control.speed <= 5 ? '#808080' : '#fff' }"
        title="X0.5"
        @click="toAdjust('-')"
        ><DArrowLeft
      /></el-icon>
      <el-icon
        :style="{
          color: data.control.speed >= 160 ? '#808080' : '#fff',
        }"
        title="X2"
        @click="toAdjust('+')"
        ><DArrowRight
      /></el-icon>
      <el-icon title="重播" @click="toAdjust('replay')"><Refresh /></el-icon>
      <el-button class="ml-1" type="primary" @click="changeView('follow')"
        >跟随视角</el-button
      >
      <el-button type="primary" @click="changeView('incar')"
        >车内视角</el-button
      >
      <el-button type="primary" @click="changeView('free')">自由视角</el-button>
      <div class="speed">{{ data.control.speed }}m/s</div>
    </div>
    <el-progress
      class="mt-3"
      striped-flow
      :percentage="data.control.percentage.toFixed(2)"
      :stroke-width="20"
      :show-text="true"
      :text-inside="true"
      status="success"
    />
  </div>

  <!-- 车内滚动横幅 -->
  <div v-if="data.isBanner" class="box-banner">
    <p class="marquee">{{ data.banner }}</p>
  </div>
  <div id="cesiumContainer"></div>
  <!-- <button class="absolute top-10 left-10 z-99 text-red-500" @click="toBegin">
    开始
  </button>
  <button
    class="absolute top-10 left-40 z-99 text-blue-500"
    @click="changeView"
  >
    车内视角
  </button> -->
  <router-view></router-view>
</template>
<script setup>
import * as Cesium from "cesium";
import { onMounted, reactive, ref } from "vue";
import modifyMap from "./tool/filterColor";
import loadData from "./assets/load.json";
import { getSiteTimes, getSampleData, spaceDistance } from "./tool/trajectory";
import * as turf from "@turf/turf";
import {
  VideoPause,
  VideoPlay,
  DArrowRight,
  DArrowLeft,
  Refresh,
} from "@element-plus/icons-vue";
import Bubble from "./tool/bubbleCar";
let viewer;
Cesium.Ion.defaultAccessToken =
  "your token";
// 高德地图api
const layer = new Cesium.UrlTemplateImageryProvider({
  url: "http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
  minimumLevel: 4,
  maximumLevel: 18,
});
const data = reactive({
  carInfo: {},
  index: 0,
  fromName: "",
  toName: "",
  control: {
    play: false,
    speed: 20,
    percentage: 0,
  },
  isBanner: false,
  banner: "欢迎乘坐梦想之车",
  fromNameTip: "",
  toNameTip: "",
});
let isBegin = false,
  isInCar = false,
  pickLabel,
  bubble;

const img = ref("");
onMounted(() => {
  // viewer是操控地图api的开始
  viewer = new Cesium.Viewer("cesiumContainer", {
    imageryProvider: layer,
    baseLayerPicker: false, //是否显示图层控件
    animation: false, //是否显示动画控件
    timeline: false, //是否显示时间轴控件
    fullscreenButton: false, //是否显示全屏控件
    geocoder: false, //是否显示搜索控件
    homeButton: false, //是否显示主页按钮
    navigationHelpButton: false, //是否显示帮助提示按钮
    sceneModePicker: false, //是否显示投影方式控件
    shouldAnimate: true, // 是否自动播放
    selectionIndicator: false, //隐藏选中框
    infoBox: false, //隐藏右上角信息框
    shadows: true,
  });
  // 设置滤色
  modifyMap(viewer, {
    invertColor: true,
    filterRGB: [70, 110, 120],
  });
  initData();
});

// 跳转到站牌
const toStation = (index) => {
  changeView("free");
  if (pickLabel) {
    pickLabel.label.fillColor = Cesium.Color.WHITE;
  }
  pickLabel = viewer.entities.getById("label" + index);
  // console.log(pickLabel);
  pickLabel.label.fillColor = Cesium.Color.YELLOW;
  viewer.flyTo(pickLabel);
};

// 控制按钮
const toAdjust = (type) => {
  if (type == "play" || type == "replay") {
    if (type == "replay") {
      img.value.style.top = "10px";
      img.value.style.left = "17px";
      data.control.percentage = 0;
      data.index = 0;
      viewer.clock.currentTime = viewer.clock.startTime;
      data.fromName = loadData.stations[0].name;
      data.toName = loadData.stations[1].name;
      data.banner = "欢迎乘坐梦想之车";
    }
    if (!isBegin) {
      isBegin = true;
      toBegin();
    }
    data.control.play = true;
    viewer.clock.shouldAnimate = true;
  } else if (type == "pause") {
    data.control.play = false;
    viewer.clock.shouldAnimate = false;
  } else if (data.control.speed > 5 && type == "-") {
    data.control.speed /= 2;
    viewer.clockViewModel.multiplier /= 2;
  } else if (data.control.speed < 160 && type == "+") {
    data.control.speed *= 2;
    viewer.clockViewModel.multiplier *= 2;
  } else if (type == "replay") {
    viewer.clock.currentTime = viewer.clock.startTime;
  }
};

// 改变视角;
const changeView = (type) => {
  if (type == "incar") {
    isInCar = true;
    data.isBanner = true;
  } else if (type == "follow") {
    isInCar = false;
    data.isBanner = false;
    viewer.trackedEntity = entity;
  } else if (type == "free") {
    isInCar = false;
    data.isBanner = false;
    viewer.trackedEntity = null;
    viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
  }
};

// 获取数据库的点占总的长度百分比
// const getProportion = () => {
//   const start = turf.point(lineGeoJson.geometry.coordinates[0]);
//   const stop = turf.point([114.406979, 30.462812]);
//   const sliced = turf.lineSlice(start, stop, lineGeoJson);
//   // console.log(sliced);
//   // 截取站牌长度比较
//   loadData.stations.forEach((item, i) => {
//     const stationsStop = item.xy_coords.split(";").map((a) => Number(a));
//     const stationsSliced = turf.lineSlice(start, stationsStop, lineGeoJson);
//     // console.log(stationsSliced);
//     if (turf.length(stationsSliced) < turf.length(sliced)) {
//       index = i;
//     }
//   });

//   // 计算截取的长度/总长度的百分比
//   return turf.length(sliced) / turf.length(lineGeoJson);
// };
// 公交车轨迹
let entity, timeObj;
const toBegin = () => {
  // const proportion = getProportion();
  // console.log(proportion);
  timeObj = getSiteTimes(positions, 20);
  // 设置时间边界
  const start = Cesium.JulianDate.fromDate(new Date(2015, 1, 1, 11));
  const stop = Cesium.JulianDate.addSeconds(
    start,
    timeObj.timeSum,
    new Cesium.JulianDate()
  );
  // const newTime = Cesium.JulianDate.addSeconds(
  //   start,
  //   timeObj.timeSum * proportion,
  //   new Cesium.JulianDate()
  // );
  // 设置时间段
  viewer.clock.startTime = start.clone();
  viewer.clock.stopTime = stop.clone();
  viewer.clock.currentTime = start.clone(); //当前时间
  data.carInfo.peopleNum = Math.ceil(Math.random() * (30 - 10)) + 10;
  // viewer.clock.currentTime = newTime.clone(); //当前时间

  const position = getSampleData(positions, start, timeObj.siteTime);

  entity = viewer.entities.add({
    availability: new Cesium.TimeIntervalCollection([
      new Cesium.TimeInterval({
        start: start,
        stop: stop,
      }),
    ]),
    model: {
      uri: "/src/assets/bus.gltf",
      minimumPixelSize: 40,
      scale: 1.2,
    },
    position: position,
    orientation: new Cesium.VelocityOrientationProperty(position),
  });

  viewer.trackedEntity = entity;

  // 初始化数据
  img.value.style.top = "10px";
  img.value.style.left = "17px";
  data.control.percentage = 0;
  data.index = 0;

  // 创建弹窗
  bubble = new Bubble({
    viewer,
    carInfo: data.carInfo,
  });
  // 监听公交车的运动
  viewer.clock.onTick.addEventListener(tickEventHandler);
};

const tickEventHandler = () => {
  // 如何使公交车在站牌停下
  // 1.将当前的公交车坐标和站牌的坐标做比较
  // 2.获取他们之间的距离，在一定范围内，则停止

  // 获取当前的时间公交车的坐标
  let startPosition = entity.position.getValue(viewer.clock.currentTime);
  // console.log(a);
  // 获取站牌的坐标 比较第二个站点
  let endPosition = Cesium.Cartesian3.fromDegrees(
    ...loadData.stations[data.index + 1].xy_coords
      .split(";")
      .map((a) => Number(a))
  );

  // 得到他们之间的距离
  let distance = spaceDistance(startPosition, endPosition);

  // 滚动屏提示
  if (distance < 200) {
    data.toNameTip = loadData.stations[data.index + 1].name;
    // console.log(data.toName);
    data.banner = "前方到站" + data.toNameTip;
  }
  if (distance < 10) {
    data.index++;
    // console.log(data.index);
    if (data.index >= 12 && data.index < 24) {
      img.value.style.top = "195px";
      img.value.style.left = 17 + (data.index - 12) * 32.85 + "px";
    } else if (data.index >= 24) {
      img.value.style.top = "385px";
      img.value.style.left = 17 + (data.index - 24) * 32.85 + "px";
    } else {
      img.value.style.left = 17 + data.index * 32.85 + "px";
    }
    if (data.index == loadData.stations.length - 1) {
      alert(
        "We are arrive the terminal.乘客们，感谢您一路对我们工作理解和支持的，下车前请检查一下自己的行李物品，请不要遗忘在车厢内。"
      );
      removeEvent();
      return;
    }

    data.fromName = loadData.stations[data.index].name;
    data.toName = loadData.stations[data.index + 1].name;
    data.carInfo.peopleNum = Math.ceil(Math.random() * (30 - 10)) + 10;
    viewer.clock.shouldAnimate = false;
    data.banner = "下一站" + data.toName;
    //  else if (data.banner.length == 2) {
    //   data.banner.slice(0, 1);
    // }
    setTimeout(() => {
      viewer.clock.shouldAnimate = true;
    }, 1500);
    setTimeout(() => {
      data.banner = "欢迎乘坐梦想之车";
    }, 10000);
  }

  // 改变视角 公交车内
  let cartographic = Cesium.Cartographic.fromCartesian(startPosition);
  let lon = Cesium.Math.toDegrees(cartographic.longitude);
  let lat = Cesium.Math.toDegrees(cartographic.latitude);
  let newPosition = Cesium.Cartesian3.fromDegrees(lon, lat, 2);
  // 改变弹窗的位置
  bubble.changePosition(newPosition);
  if (isInCar) {
    viewer.trackedEntity = null;
    var ori = entity.orientation.getValue(viewer.clock.currentTime); //获取偏向角
    // var center = entity.position.getValue(viewer.clock.currentTime); //获取位置
    var transform = Cesium.Matrix4.fromRotationTranslation(
      Cesium.Matrix3.fromQuaternion(ori),
      newPosition
    ); //将偏向角转为3*3矩阵，利用实时点位转为4*4矩阵
    viewer.camera.lookAtTransform(
      transform,
      new Cesium.Cartesian3(-0.001, 0, 0)
    ); //将相机向后面放一点
  }

  // 进度条的百分比
  // 获取当前时间 用当前时间除以总时间
  const time = Cesium.JulianDate.secondsDifference(
    viewer.clock.currentTime,
    Cesium.JulianDate.fromDate(new Date(2015, 1, 1, 11))
  );
  data.control.percentage = (time / timeObj.timeSum).toFixed(5) * 100;
  // console.log(time);
  // console.log(data.control.percentage);
};

// 初始化数据
let positions = [],
  lineGeoJson;
const initData = () => {
  // 获取站牌坐标
  // console.log(loadData);
  let xyArr = [];
  let xArr = loadData.xs.split(",");
  let yArr = loadData.ys.split(",");
  xArr.forEach((item, index) => {
    positions.push(
      Cesium.Cartesian3.fromDegrees(Number(item), Number(yArr[index]))
    );
    xyArr.push([Number(item), Number(yArr[index])]);
  });
  lineGeoJson = turf.lineString(xyArr);

  // console.log(position);
  // console.log(lineGeoJson);
  // getProportion();
  // 渲染道路数据到地图上
  const line = viewer.entities.add({
    polyline: {
      positions,
      width: 10,
      material: Cesium.Color.WHITE.withAlpha(0.8),
      clampGround: true,
    },
  });

  // 获取站牌信息
  data.carInfo = loadData;
  data.fromName = loadData.stations[0].name;
  data.toName = loadData.stations[1].name;
  // 将公交车牌模型添加进去;
  loadData.stations.forEach((item, index) => {
    // console.log(item);
    // 获得站牌坐标 并转为笛卡尔坐标
    let position = Cesium.Cartesian3.fromDegrees(
      ...item.xy_coords.split(";").map((a) => Number(a))
    );
    let positionLabel = Cesium.Cartesian3.fromDegrees(
      ...item.xy_coords.split(";").map((a) => Number(a)),
      24
    );

    // 公交车牌的朝向
    let orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      Cesium.HeadingPitchRoll.fromDegrees(90, 0, 0)
    );
    // console.log(position);
    // 添加到地图上
    viewer.entities.add({
      position,
      orientation,
      model: {
        uri: "/src/assets/model.gltf",
        scale: 0.07,
        minimumPixelSize: 10,
      },
    });
    viewer.entities.add({
      position: positionLabel,
      id: "label" + index,
      label: {
        text: item.name,
        font: "10px Helvetica",
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        fillColor: Cesium.Color.WHITE, //字体颜色
        backgroundColor: Cesium.Color.BLACK.withAlpha(0.5), //背景颜色
        showBackground: true, //是否显示背景颜色
      },
    });
  });
  viewer.flyTo(line);
};

// 移除事件
const removeEvent = () => {
  bubble.windowClose();
  viewer.clock.onTick.removeEventListener(tickEventHandler);
  viewer.entities.remove(entity);
  changeView("free");
  isBegin = false;
  data.control.play = false;
  viewer.clock.shouldAnimate = false;
};

// 监听用户是否离开页面 离开 公交车停止运动
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    viewer.clock.shouldAnimate = false;
    data.control.play = false;
  }
});
</script>
<style lang="scss" scoped>
#cesiumContainer {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
.fromTo {
  display: flex;
  position: absolute;
  left: 0.5%;
  width: 460px;
  height: 70px;
  top: 7%;
  z-index: 999;
  background-color: rgba(4, 12, 46, 0.812);
  padding: 10px 15px 10px;
  border: 1px solid #4f7cb1;
  justify-content: space-between;
  border-radius: 7px;
  div {
    color: #fff;
    font-size: 20px;
    line-height: 50px;
  }
}
.carInfo {
  position: absolute;
  top: 17%;
  left: 0.5%;
  z-index: 999;
  background-color: #13396a5e;
  padding: 10px 15px 10px;
  width: 460px;
  height: 380px;
  overflow: hidden;
  border-radius: 7px;
  overflow: auto;
  .itemStation {
    color: #fff;
    font-size: 14px;
    float: left;
    width: 25px;
    height: 153px;
    text-align: center;
    font-family: "Microsoft YaHei", 微软雅黑;
    line-height: 15px;
    cursor: pointer;
    word-break: normal;
    // overflow: hidden;
    color: #00ffff; /*设置文字颜色*/
    text-shadow: 0 1px 2px #00ffff95; /*设置文字阴影*/
    font-weight: 500; /*设置文字宽度*/
    margin: 25px 4px 10px 4px;
    .num {
      display: inline-block;
      width: 20px;
      font-family: arial;
      padding-bottom: 6px;
      cursor: pointer;
    }
  }
  .img {
    width: 30px;
    position: absolute;
    transition: all 0.7s ease 0s;
    left: 17px;
    cursor: pointer;
    z-index: 1;
    backface-visibility: hidden;
    display: block;
  }

  // 设置滚动条样式
  &::-webkit-scrollbar {
    /*滚动条整体样式*/
    width: 10px; /*高宽分别对应横竖滚动条的尺寸*/
    height: 1px;
  }
  &::-webkit-scrollbar-thumb {
    /*滚动条里面小方块*/
    border-radius: 10px;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
    background: #07d3c238;
  }
  &::-webkit-scrollbar-track {
    /*滚动条里面轨道*/
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    background: #05cfbe0a;
  }
}
.control {
  position: absolute;
  padding: 10px 15px 10px;
  left: 0.5%;
  width: 460px;
  height: 113px;
  top: 70%;
  z-index: 999;
  background-color: rgba(4, 12, 46, 0.812);
  border: 1px solid #4f7cb1;
  border-radius: 7px;

  .iconList {
    color: #fff;
    font-size: 33px;
    margin-top: 5px;
    .el-icon {
      cursor: pointer;
      color: #fff;
      &:hover {
        color: #7c4dff !important;
      }
    }
    .el-button {
      padding: 0 5px;
      margin-top: -12px;
    }
    .speed {
      float: right;
      margin-top: 10px;
      font-size: 18px;
    }
  }
}
.box-banner {
  display: flex;
  position: absolute;
  right: 477px;
  top: 0px;
  width: 583px;
  height: 92px;
  font-family: "微软雅黑"; /*设置字体*/
  // background: lightgreen;
  background-color: #222222;
  margin: 50px auto; /*设置外边距*/
  font-size: 25px; /*设置文字大小*/
  // color: red; /*设置文字颜色*/
  color: #0000ff; /*设置文字颜色*/
  overflow: hidden; /*隐藏溢出部分内容*/
  letter-spacing: 20px;
  z-index: 99;
  line-height: 92px;
}
.marquee {
  // width: 700px;
  // text-align: center;
  position: relative; /*设置相对定位*/
  // left: 10%;
  animation: marquee 5s linear infinite alternate, shine 2.4s infinite; /*设置动画*/
  transition: all 2s ease-out;
}
@keyframes marquee {
  /*创建动画*/
  0% {
    left: 2%;
  }
  100% {
    left: 35%;
  }
  // 0% {
  //   transform: translateX(-90%);
  // }
  // 100% {
  //   transform: translateX(130%);
  // }
}
@keyframes shine {
  /*创建动画*/
  0%,
  100% {
    color: #fff;
    text-shadow: 0 0 10px #0000ff, 0 0 10px #0000ff;
  }
  50% {
    text-shadow: 0 0 10px #0000ff, 0 0 40px #0000ff;
  }
}
</style>
