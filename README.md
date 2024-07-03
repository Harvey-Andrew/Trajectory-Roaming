个人博客：[CSDN 博客-满分观察网友 z](https://douglas.blog.csdn.net)

演示地址：[哔哩哔哩-满分观察网友 z](https://www.bilibili.com/video/BV1Nqh6efEYT/?spm_id_from=333.999.0.0)

这是一个用 Cesium.js 做的公交车轨迹漫游，实现的功能有加载站点和道路轨迹点数据、监听车辆的实时位置、车辆控制器。滚动屏等等。

[TOC]

# 1. 地图初始化

加载高德地图。

```js
const layer = new Cesium.UrlTemplateImageryProvider({
  url: "http://webrd02.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
  minimumLevel: 4,
  maximumLevel: 18,
});
```

对高德地图进行滤色处理。

```js
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
```

![image-20240702224531955](https://gitee.com/dongxiaogit/image2/raw/master/image/image-20240702224531955.png)

load.json 道路数据分析

![image-20240702224752939](https://gitee.com/dongxiaogit/image2/raw/master/image/image-20240702224752939.png)

front_name：公交站起点

terminal_name：公交站终点

xs，ys：是轨迹点的坐标经纬度，需要进行处理

start_time：开始时间

end_time：结束时间

length：路程（公里）

stations：每个站点

- name：站点的名字
- xy_coords：站点的坐标

# 2. 数据渲染

## 2.1. 轨迹点

首先处理每个轨迹点的坐标，它们的经纬度坐标分开，需要拼接起来，使用 forEach 循环进行拼接，这里只需要循环一次即可，因为经度和纬度的坐标数组都是一样长的，另一个可以根据循环的索引获得。再将经纬度坐标转为笛卡尔坐标，最后推入一个数组中保存。

```js
let xArr = loadData.xs.split(",");
let yArr = loadData.ys.split(",");
xArr.forEach((item, index) => {
  positions.push(
    Cesium.Cartesian3.fromDegrees(Number(item), Number(yArr[index]))
  );
  xyArr.push([Number(item), Number(yArr[index])]);
});
```

将轨迹点数据渲染到页面上。

```js
const line = viewer.entities.add({
  polyline: {
    positions,
    width: 10,
    material: Cesium.Color.WHITE.withAlpha(0.8),
    clampGround: true,
  },
});
```

## 2.2. 车牌

处理每个车牌的数据，先遍历 loadData.stations，再获得里面 xy_coords 数据，处理完后转为笛卡尔坐标

```js
// 获得站牌坐标 并转为笛卡尔坐标
let position = Cesium.Cartesian3.fromDegrees(
  ...item.xy_coords.split(";").map((a) => Number(a))
);
```

加载对应的模型,，并改变站牌的大小和方向，进来的时候可以对着我们。

```js
viewer.entities.add({
  position,
  orientation,
  model: {
    uri: "/src/assets/model.gltf",
    scale: 0.07,
    minimumPixelSize: 10,
  },
});
```

```js
// 公交车牌的朝向
let orientation = Cesium.Transforms.headingPitchRollQuaternion(
  position,
  Cesium.HeadingPitchRoll.fromDegrees(90, 0, 0)
);
```

## 2.3. 站牌标注

展示站牌的标注，它的坐标跟站牌一样，但是高度却不一样，需要额外进行处理。

```js
let positionLabel = Cesium.Cartesian3.fromDegrees(
  ...item.xy_coords.split(";").map((a) => Number(a)),
  24
);
```

添加站牌标注到地图上。

```js
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
```

![image-20240702230605739](https://gitee.com/dongxiaogit/image2/raw/master/image/image-20240702230605739.png)

# 3. 计算时间

获得开始的时间和结束时间，开始时间可以随便给，根据公式 s=vt，s 保持不变，v 可以自己设定，这样就可以计算得到结束的时间了。

## 3.1. 时间总和

这里封装一个数据来计算时间总数和每个轨迹点对应的系统时间，它接受两个参数：pArr（轨迹点数组）和 speed（速度）。函数的实现原理是计算轨迹点之间的距离，利用 Cesium 自带的`distance`计算，并将这些距离除以速度以得到每个轨迹点所对应的时间。最后，函数返回一个包含时间总和每个轨迹点对应的系统时间。

```js
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
```

设置速度为 20，可以获得时间总和每个轨迹点对应的系统时间。

![image-20240702232646501](https://gitee.com/dongxiaogit/image2/raw/master/image/image-20240702232646501.png)

## 3.2. 系统时间赋值

这时可以设置开始时间和结束时间。

```js
// 设置时间边界
const start = Cesium.JulianDate.fromDate(new Date(2015, 1, 1, 11));
const stop = Cesium.JulianDate.addSeconds(
  start,
  timeObj.timeSum,
  new Cesium.JulianDate()
);
```

光是拿到时间没有用，需要给系统时间赋值。

```js
// 设置时间段
viewer.clock.startTime = start.clone();
viewer.clock.stopTime = stop.clone();
viewer.clock.currentTime = start.clone(); //当前时间
```

## 3.3. 采样位置

定义了一个名为 getSampleData 的函数，该函数接受三个参数：pArr（轨迹点数组）、start（开始时间）和 siteTime（时间戳数组）。函数的实现原理是将轨迹点数组 pArr 中的每个点按照时间戳数组 siteTime 中的对应时间添加到 position 对象中，从而形成一个采样位置属性。也就是将轨迹点数据转换为 Cesium 可以理解的格式，从而在地图上绘制轨迹。

为什么要传入**siteTime**时间节点传过来呢？

因为我们算出的时间节点都是从 0 开始算的，但是我们要把时间换算到系统里面去，应该是开始的时间加上时间节点。

这个案例最重点的地方：计算每个轨迹点对应的系统时间

```js
for (let i = 0; i < pArr.length; i++) {
  //每一个轨迹点所对应的系统时间
  const time = Cesium.JulianDate.addSeconds(
    start,
    siteTime[i],
    new Cesium.JulianDate()
  );
  position.addSample(time, pArr[i]);
}
console.log(position);
```

如果能在\_property.\_values 中拿到 996 个坐标以及 332 个所对应的系统时间，那就是没问题了，因为笛卡尔是三个坐标。

![image-20240702234146455](https://gitee.com/dongxiaogit/image2/raw/master/image/image-20240702234146455.png)

## 3.4. 加载公交车

根据实体的速度来计算其朝向。

```js
orientation: new Cesium.VelocityOrientationProperty(position);
```

将创建的实体设置为视图的跟踪实体。跟踪实体是视图中的一个实体，当我们在视图中移动时，它会自动跟随我们的位置。

```js
viewer.trackedEntity = entity;
```

如何使公交车在站牌停下？

1. 需要监听时钟
2. 将当前的公交车坐标和站牌的坐标做比较
3. 获取它们之间的距离，在一定范围内，则停止

```js
// 监听公交车的运动
viewer.clock.onTick.addEventListener(tickEventHandler);
```

```js
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
```

> 这里的距离应该是车的中心点到站牌的距离

如果小于一定的距离，就让公交车停下来，也就是 `viewer.clock.shouldAnimate = false;`

## 3.5. 气泡窗跟随

获取当前的坐标，将气泡窗的位置进行更新。

![image-20240703085708150](https://gitee.com/dongxiaogit/image2/raw/master/image/image-20240703085708150.png)

# 4. 面板展示

第一栏是起点与目的地，第二栏是编号和站牌名字，第三栏是车辆控制器：暂停，减速，加速，重置，跟随视角，车内视角，自由视角，速度以及进度条。

![image-20240703085025489](https://gitee.com/dongxiaogit/image2/raw/master/image/image-20240703085025489.png)

## 4.1. 起点与目的地

获取站牌的名称，包括起点和目的地。

```js
data.fromName = loadData.stations[data.index].name;
data.toName = loadData.stations[data.index + 1].name;
```

## 4.2. 站牌名字

加载站牌名字到面板上，这里有一些动画效果，到站时，展示面板也要高亮显示，并挪动图标。

```js
if (data.index >= 12 && data.index < 24) {
  img.value.style.top = "195px";
  img.value.style.left = 17 + (data.index - 12) * 32.85 + "px";
} else if (data.index >= 24) {
  img.value.style.top = "385px";
  img.value.style.left = 17 + (data.index - 24) * 32.85 + "px";
} else {
  img.value.style.left = 17 + data.index * 32.85 + "px";
}
```

点击站牌，也可以实现跳转到相应的站牌。

```js
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
```

## 4.3. 车辆控制器

播放按钮，设置播放状态，点击后播放，变为暂停按钮，再次点击，变为播放按钮。

```js
if (!isBegin) {
  isBegin = true;
  toBegin();
}
data.control.play = true;
viewer.clock.shouldAnimate = true;
```

暂停就是把时间进行暂停。

```js
viewer.clock.shouldAnimate = false;
```

重播时间就是让系统的当前时间再等于一下系统的开始时间，图标，进度条，站牌都还原。

```js
img.value.style.top = "10px";
img.value.style.left = "17px";
data.control.percentage = 0;
data.index = 0;
viewer.clock.currentTime = viewer.clock.startTime;
data.fromName = loadData.stations[0].name;
data.toName = loadData.stations[1].name;
```

公交车的进度条，根据 s=vt，我们需要计算的是时间，用当前花费的时间除以总时间，可以得到进度条，花费的时间可以用当前时间戳减去开始时间戳。

## 4.4. 视角切换

自由视角就是取消跟随视角 `viewer.trackedEntity = null;`和摆脱观察者模式 `viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);`。

车内视角就是行驶时更新相机的朝向，使其始终朝向前方。

根据车内的坐标系，可以确定相机放的位置。相机的位置不能写(0,0,0)，不能跟放的东西是同一个点，会报错的。

```js
viewer.camera.lookAtTransform(transform, new Cesium.Cartesian3(-0.001, 0, 0)); //将相机向后面放一点
```

![image-20240703092327068](https://gitee.com/dongxiaogit/image2/raw/master/image/image-20240703092327068.png)

不管你如何修改上面的三个值，你都无法实现车内的视角，原因是我们所看向的点永远在车底，我们拿到的实时坐标是没有高度的，永远是 0。我们应该要把中心点提一下，x 轴往后一点，这样就可以实现了。

```js
// 改变视角 公交车内
let cartographic = Cesium.Cartographic.fromCartesian(startPosition);
let lon = Cesium.Math.toDegrees(cartographic.longitude);
let lat = Cesium.Math.toDegrees(cartographic.latitude);
let newPosition = Cesium.Cartesian3.fromDegrees(lon, lat, 2);
```

```js
if (isInCar) {
  viewer.trackedEntity = null;
  var ori = entity.orientation.getValue(viewer.clock.currentTime); //获取偏向角
  // var center = entity.position.getValue(viewer.clock.currentTime); //获取位置
  var transform = Cesium.Matrix4.fromRotationTranslation(
    Cesium.Matrix3.fromQuaternion(ori),
    newPosition
  ); //将偏向角转为3*3矩阵，利用实时点位转为4*4矩阵
  viewer.camera.lookAtTransform(transform, new Cesium.Cartesian3(-0.001, 0, 0)); //将相机向后面放一点
}
```

![image-20240703093022682](https://gitee.com/dongxiaogit/image2/raw/master/image/image-20240703093022682.png)

车内视角参考：[cesium 巡逻获取对象实时信息并实现切换第一人称视角](https://blog.csdn.net/m0_45305745/article/details/129682333?spm=1001.2014.3001.5506)

## 4.5. 后端数据模拟

模拟后端给你一个点，从这个点开始跑，`[114.406979, 30.462812]`。

第一个思路：从所有的轨迹点钟中选出后端的点，但是后端提供的点不一定在轨迹点上，也有可能有轨迹点的连线上。

第二个思路：算出后端给的点跑了多久，就当时间给回系统时间。可以用该点到起始点的距离除以总的路程，再乘以时间综合。

使用 turf 库的[线段截取](https://turfjs.fenxianglu.cn/category/misc/lineSlice.html)，获取一条线、起点和终点，并返回这些点之间的线段。起止点不需要正好落在直线上。注意都是 geojson 数据！

```js
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
```

```js
const start = turf.point(lineGeoJson.geometry.coordinates[0]); //起点
const stop = turf.point([114.406979, 30.462812]); //终点
const sliced = turf.lineSlice(start, stop, lineGeoJson); //线
// console.log(sliced);
```

计算截取的长度/总长度的百分比，并求出相应的时间

```js
return turf.length(sliced) / turf.length(lineGeoJson);
```

```js
const proportion = getProportion(); //getProportion是返回截取的长度/总长度的百分比
const newTime = Cesium.JulianDate.addSeconds(
  start,
  timeObj.timeSum * proportion,
  new Cesium.JulianDate()
);
```

同时还要考虑公交车是否到站了

第一个思路;，后端的点需要跟所有的站点进行比较，拿到最小的距离。但是当线路是 U 型弯回来的时候，如果马路对面的站点比较近，就和实际效果不一样。

![image-20240703102436588](https://gitee.com/dongxiaogit/image2/raw/master/image/image-20240703102436588.png)

第二个思路：遍历所有的站点到起始点的距离，用来跟截取的线段长度做比较，如果截取的线段长度小于站点到起始点线段长度，说明找到了更接近的站点，将当前点的索引（i）赋值给 index。

```js
// 截取站牌长度比较
loadData.stations.forEach((item, i) => {
  const stationsStop = item.xy_coords.split(";").map((a) => Number(a));
  const stationsSliced = turf.lineSlice(start, stationsStop, lineGeoJson);
  // console.log(stationsSliced);
  if (turf.length(stationsSliced) < turf.length(sliced)) {
    index = i;
  }
});
```

## 4.6. 调整速度

根据 s=vt，s 不变，如果要更改 v 的话，其他都会发生改变，只有当时间变快时，速度就可以变得快。

## 4.7. 滚动屏

根据公交车与站牌的距离，显示滚动屏的内容，距离小于一定的值，就会显示前方到站 xxx，到了站点起步，就会显示下一站 xxx，然后过一会时间就会恢复初始的内容。

![QQ录屏20240703104224 -original-original](https://gitee.com/dongxiaogit/image2/raw/master/image/QQ录屏20240703104224 -original-original.gif)

# 5. 事件监听器

当监听网页切走后，公交车将会暂停。

```js
// 监听用户是否离开页面 离开 公交车停止运动
document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    viewer.clock.shouldAnimate = false;
    data.control.play = false;
  }
});
```

# 6. 移除事件

当公交车到达终点后，会清除所有的事件。

```js
const removeEvent = () => {
  bubble.windowClose();
  viewer.clock.onTick.removeEventListener(tickEventHandler);
  viewer.entities.remove(entity);
  changeView("free");
  isBegin = false;
  data.control.play = false;
  viewer.clock.shouldAnimate = false;
};
```

也会弹出到达终点。

```js
if (data.index == loadData.stations.length - 1) {
  alert(
    "We are arrive the terminal.乘客们，感谢您一路对我们工作理解和支持的，下车前请检查一下自己的行李物品，请不要遗忘在车厢内。"
  );
  removeEvent();
  return;
}
```

参考案例：[Cesium 官方车辆轨迹漫游](![img](<file:///C:\Users\Acer\AppData\Roaming\Tencent\QQTempSys%W@GJ$ACOF(TYDYECOKVDYB.png)https://sandcastle.cesium.com/?src=Particle%20System.html>)

![image-20240702230945514](https://gitee.com/dongxiaogit/image2/raw/master/image/image-20240702230945514.png)
