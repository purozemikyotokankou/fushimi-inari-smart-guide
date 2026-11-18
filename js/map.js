/*
==========================================
Fushimi Inari Smart Guide
map.js
Meta Map Style
==========================================
*/


document.addEventListener(
"DOMContentLoaded",
function(){



// ==============================
// 地図初期化
// ==============================


const map = L.map("map")
.setView(
    [34.967146,135.772683],
    16
);



L.tileLayer(

"https://tile.openstreetmap.org/{z}/{x}/{y}.png",

{

attribution:
"&copy; OpenStreetMap contributors"

}

)

.addTo(map);







// ==============================
// データ
// ==============================


let spots=[];

let markers=[];

let currentCategory="all";







// ==============================
// JSON取得
// ==============================


fetch("data/spots.json")

.then(response=>response.json())

.then(data=>{


    spots=data;


    createMarkers();


    displaySpots(spots);


})

.catch(error=>{


console.error(
"spots.json error",
error
);


});









// ==============================
// ピン作成
// ==============================


function createMarkers(){



markers.forEach(m=>{

map.removeLayer(m);

});


markers=[];



spots.forEach(spot=>{


const marker=
L.marker(
[
spot.lat,
spot.lng
]

)

.addTo(map);



marker.bindPopup(`


<h3>
${spot.name}
</h3>


<p>
${spot.description}
</p>


<button
onclick="showDetail(${spot.id})">

詳細を見る

</button>


`);



marker.on(
"click",
function(){

showDetail(
spot.id
);

}

);



markers.push(marker);



});



}









// ==============================
// 左側一覧
// ==============================


function displaySpots(data){



const list=
document.getElementById(
"spotList"
);



list.innerHTML="";




data.forEach(spot=>{


const card=
document.createElement(
"div"
);



card.className=
"map-card";



card.innerHTML=`

<h3>
📍 ${spot.name}
</h3>


<span>
${spot.category}
</span>


<p>
${spot.description}
</p>


<button>
見る
</button>

`;





card.querySelector("button")
.onclick=function(){


moveToSpot(
spot.lat,
spot.lng
);


showDetail(
spot.id
);



};




list.appendChild(card);



});



}









// ==============================
// 詳細表示
// ==============================


window.showDetail=function(id){



const spot=
spots.find(
s=>s.id===id
);



if(!spot)return;




const detail=
document.getElementById(
"spotDetail"
);



detail.innerHTML=`

<h2>

${spot.name}

</h2>


<p>
カテゴリー：
${spot.category}
</p>


<p>

${spot.description}

</p>


<p>

⏱ 所要時間：
${spot.time}

</p>


<button
onclick="
startRoute(${spot.id})
">

ここからルート作成

</button>

`;




moveToSpot(
spot.lat,
spot.lng
);



};









// ==============================
// 地図移動
// ==============================


function moveToSpot(
lat,
lng
){


map.setView(

[
lat,
lng
],

18

);


}









// ==============================
// 検索
// ==============================


document
.getElementById(
"searchButton"
)

.onclick=function(){



const text=
document
.getElementById(
"searchBox"
)
.value;



const result=
spots.filter(

spot=>

spot.name.includes(text)

);



displaySpots(result);



if(result.length>0){


moveToSpot(

result[0].lat,

result[0].lng

);


}



};









// ==============================
// カテゴリ
// ==============================


document
.querySelectorAll(
".category button"
)

.forEach(
button=>{


button.onclick=function(){



const category=
this.dataset.category;



currentCategory=
category;




if(category==="all"){



displaySpots(
spots
);



}

else{


displaySpots(

spots.filter(

spot=>

spot.category===category

)

);


}



};



});









// ==============================
// 現在地
// ==============================


document
.getElementById(
"locationButton"
)

.onclick=function(){



navigator.geolocation.getCurrentPosition(

position=>{


const lat=
position.coords.latitude;


const lng=
position.coords.longitude;



map.setView(

[
lat,
lng
],

17

);



L.marker(

[
lat,
lng
]

)

.addTo(map)

.bindPopup(
"現在地"
)

.openPopup();



},


()=>{


alert(
"現在地を取得できません"
);


}

);



};









// ==============================
// ルート作成連携
// ==============================


window.startRoute=function(id){



localStorage.setItem(

"selectedSpot",

id

);



location.href=
"planner.html";


};







console.log(
"Meta Map Loaded"
);



});