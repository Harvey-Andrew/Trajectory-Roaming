<template>
  <div class="box">
    <div class="pine"></div>
    <div class="box-wrap">
      <!-- <div class="close" @click="closeClick">X</div> -->
      <div>
        <div class="area">
          <div class="area-title fontColor">{{ carInfo.key_name }}公交车</div>
        </div>
        <div class="content textColor">
          <div class="data-li">
            <div>单程公里数：</div>
            <div>
              <span>{{ Number(carInfo.length).toFixed(2) }}km</span>
            </div>
          </div>
          <div class="data-li">
            <div>首末班车时间：</div>
            <div>
              <span> {{ carInfo.start_time }}~{{ carInfo.end_time }} </span>
            </div>
          </div>
          <div class="data-li">
            <div>单程最高票价：</div>
            <div>
              <span> {{ carInfo.total_price }} 元 </span>
            </div>
          </div>
          <div class="data-li">
            <div>车内人数：</div>
            <div>
              <span class="num"> {{ carInfo.peopleNum }} 人 </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { getCurrentInstance, onMounted, onBeforeUpdate } from "vue";
let { carInfo } = defineProps({
  carInfo: Object,
});
let that;

const closeClick = () => {
  that.closeEvent();
};

onMounted(() => {
  that = getCurrentInstance().vnode;
});
</script>
<style>
.box {
  width: 260px;
  position: absolute;
  bottom: 0;
  left: 0;
}
.close {
  position: absolute;
  color: #fff;
  top: 1px;
  right: 10px;
  text-shadow: 2px 2px 2px #022122;
  cursor: pointer;
  animation: fontColor 1s;
}
.box-wrap {
  position: absolute;
  left: 21%;
  top: 0;
  width: 100%;
  height: 170px;
  border-radius: 50px 0px 50px 0px;
  border: 1px solid #38e1ff;
  background-color: #38e1ff4a;
  box-shadow: 0 0 10px 2px #29baf1;
  animation: slide 2s;
}
.box-wrap .area {
  position: absolute;
  top: 20px;
  right: 0;
  width: 95%;
  height: 30px;
  background-image: linear-gradient(to left, #4cdef9, #4cdef96b);
  border-radius: 30px 0px 0px 0px;
  animation: area 1s;
}
.pine {
  position: absolute;
  width: 100px;
  height: 100px;
  box-sizing: border-box;
  line-height: 120px;
  text-indent: 5px;
}

.pine::before {
  content: "";
  position: absolute;
  left: 0;
  bottom: -83px;
  width: 40%;
  height: 200px;
  box-sizing: border-box;
  border-bottom: 1px solid #38e1ff;
  transform-origin: bottom center;
  transform: rotateZ(135deg) scale(1.5);
  animation: slash 0.5s;
  filter: drop-shadow(1px 0px 2px #03abb4);
  /* transition: slash 2s; */
}

.area .area-title {
  text-align: center;
  line-height: 30px;
}
.textColor {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  text-shadow: 1px 1px 5px #002520d2;
  animation: fontColor 1s;
}

.fontColor {
  font-size: 16px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 1px 1px 5px #002520d2;
  animation: fontColor 1s;
}
.content {
  padding: 55px 10px 10px 10px;
}
.content .data-li {
  display: flex;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  font-size: 16px;
  margin-left: 20px;
  margin-top: 5px;
}

.content .data-li .num {
  color: #f09e28;
  font-weight: 600;
  color: #f09e28;
  text-shadow: 1px 1px 5px #002520d2;
  animation: fontColor 1s;
}

@keyframes fontColor {
  0% {
    color: #ffffff00;
    text-shadow: 1px 1px 5px #00252000;
  }
  40% {
    color: #ffffff00;
    text-shadow: 1px 1px 5px #00252000;
  }
  100% {
    color: #ffffff;
    text-shadow: 1px 1px 5px #002520d2;
  }
}

@keyframes slide {
  0% {
    border: 1px solid #38e1ff00;
    background-color: #38e1ff00;
    box-shadow: 0 0 10px 2px #29baf100;
  }

  100% {
    border: 1px solid #38e1ff;
    background-color: #38e1ff4a;
    box-shadow: 0 0 10px 2px #29baf1;
  }
}
@keyframes area {
  0% {
    width: 0%;
  }
  25% {
    width: 0%;
  }

  100% {
    width: 95%;
  }
}

@keyframes slash {
  0% {
    transform: rotateZ(135deg) scale(0);
  }

  100% {
    transform: rotateZ(135deg) scale(1.5);
  }
}
</style>
