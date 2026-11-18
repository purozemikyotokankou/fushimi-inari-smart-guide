/*
==========================================
Fushimi Inari Smart Guide
home.js
Hero Slider
==========================================
*/


document.addEventListener("DOMContentLoaded", function(){



    // =========================
    // スライド取得
    // =========================

    const slides = document.querySelectorAll(".slide");

    const slider = document.querySelector(".slider");


    if(slides.length === 0 || !slider){

        console.log("Slider not found");

        return;

    }



    let currentSlide = 0;

    let timer;





    // =========================
    // スライド表示
    // =========================


    function showSlide(index){


        slides.forEach(function(slide){

            slide.classList.remove("active");

        });



        slides[index].classList.add("active");



        updateDots();


    }





    // =========================
    // 次へ
    // =========================


    function nextSlide(){


        currentSlide++;



        if(currentSlide >= slides.length){

            currentSlide = 0;

        }



        showSlide(currentSlide);


    }






    // =========================
    // 前へ
    // =========================


    function prevSlide(){


        currentSlide--;



        if(currentSlide < 0){

            currentSlide = slides.length - 1;

        }



        showSlide(currentSlide);


    }







    // =========================
    // 自動再生
    // =========================


    function startTimer(){


        timer = setInterval(

            nextSlide,

            5000

        );


    }



    function resetTimer(){


        clearInterval(timer);


        startTimer();


    }








    // =========================
    // 矢印ボタン
    // =========================


    const leftButton = document.createElement("button");


    leftButton.innerHTML = "❮";

    leftButton.className = "slider-button left";



    leftButton.onclick = function(){


        prevSlide();

        resetTimer();


    };





    const rightButton = document.createElement("button");


    rightButton.innerHTML = "❯";

    rightButton.className = "slider-button right";



    rightButton.onclick = function(){


        nextSlide();

        resetTimer();


    };





    slider.appendChild(leftButton);

    slider.appendChild(rightButton);









    // =========================
    // ドット作成
    // =========================


    const dotsBox = document.createElement("div");


    dotsBox.className = "dots";



    slides.forEach(function(slide,index){



        const dot = document.createElement("span");



        dot.className = "dot";



        dot.onclick = function(){


            currentSlide = index;


            showSlide(currentSlide);


            resetTimer();


        };



        dotsBox.appendChild(dot);



    });



    slider.appendChild(dotsBox);









    // =========================
    // ドット更新
    // =========================


    function updateDots(){



        const dots = document.querySelectorAll(".dot");



        dots.forEach(function(dot){


            dot.classList.remove("active-dot");


        });



        if(dots[currentSlide]){


            dots[currentSlide].classList.add("active-dot");


        }



    }








    // =========================
    // 開始
    // =========================


    showSlide(currentSlide);


    startTimer();



    console.log("home.js loaded successfully");



});