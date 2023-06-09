//@ts-ignore
import {env} from "./env.js"
const WIDTH = 500;
const HEIGHT = 500;
const body = document.getElementsByTagName("body")[0]!;
const control = document.getElementById("control")!
const translate = document.getElementById("translate")!
const scaleSpan = document.getElementById("scale")!
const zoomin = document.getElementById("zoomin")!
const zoomout = document.getElementById("zoomout")!
const colors = Array.from(document.getElementsByTagName("input"))!
let colorClickCounter= 0;
let selectedColor: HTMLInputElement = colors[0];
let mousedown = false;
let rightClickDown = false;
let mousedownXY: number[] = [0,0]
let mouseXY: number[] = [0,0];
let scale = 1;
let xoff = 0;
let yoff = 0
let mouseMovedHold = false;
let timeouts:number[] = [];
let lastRect = {x:-1,y:-1}
function mapCords(x:number,y:number){
    
    return ( WIDTH * y + x )*4
}
function getPixelFillStyle(x:number,y:number){
    let i = mapCords(x,y);       
    return `rgba(${bytes[i]},${bytes[i+1]},${bytes[i+2]},${i+3})`
}
function colorpick(x:number,y:number){
    let i = mapCords(x,y);
    let r = bytes[i];
    let g = bytes[i+1];
    let b = bytes[i+2];
    console.log("Colors ",r,g,b);
}


function redrawPixel(x:number,y:number){
    let i = mapCords(x,y);       
    ctx.clearRect(x,y,1,1)
    console.log(`Redraw pixel ${[bytes[i],bytes[i+1],bytes[i+2]]} `)
    ctx.fillStyle = `rgba(${bytes[i]},${bytes[i+1]},${bytes[i+2]},1)`
    ctx.fillRect(x,y,1,1)
}
function dimPixel(opacity: number,x: number,y: number){
    let i = mapCords(x,y);       
    ctx.clearRect(x,y,1,1)
    const colors = hexToRgba( selectedColor.value )

    ctx.fillStyle = `rgba(${colors[0]},${colors[1]},${colors[2]},${opacity})`
    ctx.fillRect(x,y,1,1)
}
function drawPixel(x:number,y:number){
    let i = mapCords(x,y);       
    ctx.clearRect(x,y,1,1)
    ctx.fillStyle = selectedColor.value
    let rgb = hexToRgba(selectedColor.value)
    bytes[i] = rgb[0]  
    bytes[i+1] = rgb[1]  
    bytes[i+2] = rgb[2]  
    ctx.fillRect(x,y,1,1)

}
function wsDrawPixel(x:number,y:number,colorHex:string){
    let i = mapCords(x,y);       
    ctx.clearRect(x,y,1,1)
    ctx.fillStyle = colorHex
    let rgb = hexToRgba(colorHex)
    bytes[i] = rgb[0]  
    bytes[i+1] = rgb[1]  
    bytes[i+2] = rgb[2]  
    ctx.fillRect(x,y,1,1)
}
function selectPixel(x : number, y : number): void{
    for(let i = 0.9; i>=0; i-=0.1){
        timeouts.push(window.setTimeout( () => {
            dimPixel(i,x,y);
            },(1-i)*1000))
    }
    timeouts.push(window.setTimeout(() => {
        for(let i = 0.1; i<=0.9; i+=0.1){
            timeouts.push(window.setTimeout( () => {
                dimPixel(i,x,y);
                },(i)*1000))
        }
    },1000))
    timeouts.push(window.setTimeout(() => selectPixel(x,y),2000))
}
function setTransform() {
    control.style.transform = "translate(" + xoff + "px, " + yoff + "px) scale(" + scale + ")";
    scaleSpan.innerHTML = scale.toString();
}
function hexToRgba(hex:string): number[]{
    var c:any;
    if(/^#?([A-Fa-f0-9]{3}){1,2}$/.test(hex)){
        c= hex.substring(1).split('');
        if(c.length== 3){
            c= [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c= '0x'+c.join('');
        return [(c>>16)&255, (c>>8)&255, c&255];
    }
    throw new Error('Bad Hex');
}
function sendPixel(x:number,y:number){

    const data = {x:x,y:y,color: selectedColor.value.replace("#","")} 
    fetch(`${env["API_URL_PREFIX"]}/api/setColor`,{
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data),
    })
    }
// Connect to websocket
const ws = new WebSocket(`ws://${env["WEBSOCKET_HOST"]}:${env["WEBSOCKET_PORT"]}`);

// Initial Canvas rendering
let canvas = <HTMLCanvasElement> document.getElementById("main");
const ctx = canvas.getContext("2d")!
let fieldFetch =  await fetch(`${env["API_URL_PREFIX"]}/api/getField`);
( document.getElementsByClassName("loader")[0] as HTMLElement).style.display = "none";
( document.getElementById("main") as HTMLCanvasElement).style.display = "block";
const data = await fieldFetch.arrayBuffer()
let bytes = new Uint8ClampedArray(data); 
bytes = bytes.map((v,i) => {
    if((i+1)%4 == 0) return 255
    else return v
})
console.log(bytes)
let pixels : ImageData =  new ImageData(bytes,WIDTH);
console.log(pixels.data)
ctx.putImageData(pixels,0,0);
ctx.imageSmoothingEnabled = false;

console.log( getPixelFillStyle(4,1) )
// Listeners
ws.addEventListener("message", (event) => {
    const data:string = event.data
    // x y color
    const params = data.split(" ")
    console.log(params)
    const x:number = Number( params[0] )
    const y:number = Number( params[1] )
    const color: string = "#" + params[2]
    wsDrawPixel(x,y,color)
});
canvas.addEventListener("mousedown", (e) => {
    if(e.button == 2) rightClickDown = true; 
    mousedown = true;   
    mousedownXY = [e.clientX - xoff,e.clientY -yoff]
    console.log(mousedownXY)
} )
canvas.addEventListener("mouseup", (e) => {
    mousedown = false;
    rightClickDown = false;
    let box = canvas.getBoundingClientRect();
    if(!mouseMovedHold){
        let mouseX = e.clientX - box.left ;
        let mouseY = e.clientY - box.top ;
        mouseX = Math.floor((mouseX / box.width) * canvas.width);
        mouseY = Math.floor((mouseY / box.height) * canvas.height);
        console.log(mouseX,mouseY)
        
        if (pickerSelected){
            colorpick(mouseX,mouseY);
        } 
        // setting color
        if ((mouseX == lastRect.x ) && (mouseY == lastRect.y )) {
            drawPixel(mouseX,mouseY)
            sendPixel(mouseX,mouseY)
            ws.send(`${mouseX} ${mouseY} ${ selectedColor.value.replace("#","") }`) 
            return
        };
        // dimming pixel logic
        timeouts.forEach(x => clearTimeout(x));
        timeouts = [];
        if(lastRect.x > -1) redrawPixel(lastRect.x,lastRect.y)
        lastRect.x = mouseX
        lastRect.y = mouseY
        console.log()
        selectPixel(mouseX,mouseY)

        
    }
    mouseMovedHold = false;
} )

control.addEventListener("mousemove", (e) => {
    if(rightClickDown){
        let box = canvas.getBoundingClientRect();
        let mouseX = e.clientX - box.left ;
        let mouseY = e.clientY - box.top ;
        mouseX = Math.floor((mouseX / box.width) * canvas.width);
        mouseY = Math.floor((mouseY / box.height) * canvas.height);
        drawPixel(mouseX,mouseY)
        sendPixel(mouseX,mouseY)
        ws.send(`${mouseX} ${mouseY} ${ selectedColor.value.replace("#","") }`) 
        return
    }
    if(mousedown){
        xoff = (e.clientX - mousedownXY[0]);
        yoff = (e.clientY - mousedownXY[1]);
        setTransform();
        mouseMovedHold = true;
    }
})
canvas.addEventListener("contextmenu",(e) => e.preventDefault())
// thanks to fmacdee
body.onwheel = function(e) {
    // take the scale into account with the offset
    console.log(e.clientX,e.clientY);
    var xs = (e.clientX - xoff) / scale,
        ys = (e.clientY - yoff) / scale,
        delta = -e.deltaY;

    // get scroll direction & set zoom level
    (delta > 0) ? (scale *= 1.2) : (scale /= 1.2);
    if(scale < 1) scale = 1 
    // reverse the offset amount with the new scale
    xoff = e.clientX - xs * scale;
    yoff = e.clientY - ys * scale;

    console.log(e.clientX,e.clientY)
    
    setTransform();   
       
}

zoomin.onclick = function (e){
    var box = canvas.getBoundingClientRect()
    for(let i = 0; i < 3; i++){
        body.dispatchEvent(
            new WheelEvent("wheel",{
                clientX: (box.x + 1/2*box.width ),
                clientY: (box.y + 1/2*box.height),
                deltaY: -1,
                
            })
        )
    }
}
zoomout.onclick = function (e){
    var box = canvas.getBoundingClientRect()
    for(let i = 0; i < 3; i++){
        body.dispatchEvent(
            new WheelEvent("wheel",{
                clientX: (box.x + 1/2*box.width ),
                clientY: (box.y + 1/2*box.height),
                deltaY: 1,
                
            })
        )
    }
}
colors.forEach((color) => {
    color.onclick = function (e){
        if(selectedColor != color) e.preventDefault()
        selectedColor.style.opacity = "0.5"
        selectedColor = color;
        color.style.opacity = "1"
        


    }
})
// Color picker logic
const picker = document.getElementById("picker")!
let pickerSelected: Boolean = false;
picker.addEventListener("click",(e)=> {
    pickerSelected = !pickerSelected;
    if(pickerSelected){
        picker.style.backgroundColor = "rgba(125,125,125,0.4)"
    }
    if(!pickerSelected){
        picker.style.backgroundColor = "rgba(200,200,200,0.1)"; 
    }
})
export {}

