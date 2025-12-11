import React from "react";
import { useState,useEffect } from "react";

const Study = () => {

const [count, setCount] = useState(0);

const [click, setClick] = useState(0);

const handleClick=()=>{
     setClick(click+1)
}

const handleminus =()=>{
    setClick(click-1)
}

useEffect(()=>{
   
    setTimeout(()=>{
        setCount(count+1)
            
    },1000)
},[count])


  return (
    <div>       
        <h1>counter {count}</h1>
        <button style={{padding:"1rem"}} onClick={handleClick} >add</button>
        <button style={{padding:"1rem"}} onClick={handleminus} >minus</button>
        <h1>num of clicks: {click}</h1>
    </div>
  );
}

export default Study;