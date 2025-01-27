/*
  part - part
  px - pixel
  sq - squared
  img - image
*/
const PART_SIZE = 5
const EDGE = PART_SIZE * 2
const WIDTH = 420 + EDGE * 2
const HEIGHT = 660 + EDGE * 2
const SWITCH_THRESHOLD = 0.85
const RADIUS = 50
const RADIUS_GROWTH = 5
const RADIUS_DECAY = 2
window.addEventListener("load", function () {
    const effect = new Effect()
    // const monitor = new PerformanceMonitor(60)
    function animate() {
        // monitor.start()
        effect.update()
        // monitor.end()
        requestAnimationFrame(animate)
    }
    animate()
})
class PerformanceMonitor {
    constructor(interval) {
        this.frameTimes = []
        this.frameCount = 0
        this.interval = interval
        this.startTime = 0
    }
    start() {
        this.startTime = performance.now()
    }
    end() {
        const endTime = performance.now()
        const frameTime = endTime - this.startTime
        this.frameTimes.push(frameTime)
        this.frameCount++
        if (this.frameCount >= this.interval) {
            const averageFrameTime =
                this.frameTimes.reduce((sum, time) => sum + time, 0) /
                this.frameTimes.length
            console.log(`Average frame time: ${averageFrameTime.toFixed(2)}ms`)
            this.frameTimes = []
            this.frameCount = 0
        }
    }
}
class Effect {
    constructor() {
        const imgs = document.getElementsByTagName("img")
        this.totalImgs = imgs.length
        this.nextImgI = 1
        this.lastSwitchTime = 0
        this.canvas = document.getElementsByTagName("canvas")[0]
        this.canvas.width = WIDTH
        this.canvas.height = HEIGHT
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })
        this.partSets = []
        this.parts = []
        this.mouse = {
            maxRadiusSq: RADIUS ** 2,
            radiusSq: 1,
            x: undefined,
            y: undefined,
        }
        this.firstMoveDispatched = false
        this.initParts(imgs)
        this.setupEventListeners()
    }
    initParts(imgs) {
        for (let i = 0; i < this.totalImgs; i++) {
            this.ctx.drawImage(imgs[0], EDGE, EDGE)
            const pxs = this.ctx.getImageData(0, 0, WIDTH, HEIGHT).data
            this.partSets[i] = this.processImg(pxs)
            imgs[0].remove()
        }
        this.parts = this.partSets[0].map((part) => part.clone())
        this.canvas.style.display = "block"
    }
    processImg(pxs) {
        const parts = []
        for (let y = 0; y < HEIGHT; y += PART_SIZE) {
            for (let x = 0; x < WIDTH; x += PART_SIZE) {
                const partData = this.getPartData(pxs, x, y)
                if (partData.isFullyTransparent) continue
                parts.push(
                    new Particle(this, x, y, partData.colors, parts.length)
                )
            }
        }
        return parts
    }
    getPartData(pxs, partX, partY) {
        const colors = []
        let isFullyTransparent = true
        const baseI = (partY * WIDTH + partX) * 4
        for (let py = 0; py < PART_SIZE; py++) {
            for (let px = 0; px < PART_SIZE; px++) {
                const pxI = baseI + (py * WIDTH + px) * 4
                if (pxs[pxI + 3] === 0) continue
                isFullyTransparent = false
                colors.push(pxs[pxI], pxs[pxI + 1], pxs[pxI + 2], pxs[pxI + 3])
            }
        }
        return { colors, isFullyTransparent }
    }
    setupEventListeners() {
        window.addEventListener("mousemove", this.handleMove.bind(this))
        window.addEventListener("touchmove", this.handleMove.bind(this))
        this.canvas.addEventListener("firstmove", () => {
            document.getElementById("touchHint").remove()
        })
    }
    handleMove(event) {
        this.mouse.x = event.touches ? event.touches[0].clientX : event.clientX
        this.mouse.y = event.touches ? event.touches[0].clientY : event.clientY
        const canvasRect = this.canvas.getBoundingClientRect()
        const canvasScale = WIDTH / canvasRect.width
        this.mouse.x = (this.mouse.x - canvasRect.left) * canvasScale
        this.mouse.y = (this.mouse.y - canvasRect.top) * canvasScale
        if (this.mouse.radiusSq < this.mouse.maxRadiusSq) {
            this.mouse.radiusSq += this.mouse.radiusSq ** 0.5 * RADIUS_GROWTH
        }
        if (!this.firstMoveDispatched) {
            this.canvas.dispatchEvent(new CustomEvent("firstmove"))
            this.firstMoveDispatched = true
        }
    }
    update() {
        this.ctx.clearRect(0, 0, WIDTH, HEIGHT)
        const frameBuffer = this.ctx.createImageData(WIDTH, HEIGHT)
        this.parts.forEach((part) => {
            this.drawParticle(part, frameBuffer)
            part.update()
        })
        this.ctx.putImageData(frameBuffer, 0, 0)
        this.updateMouseRadius()
        this.checkImgSwitch()
    }
    drawParticle(part, frameBuffer) {
        const partX = Math.round(part.x)
        const partY = Math.round(part.y)
        for (let py = 0; py < PART_SIZE; py++) {
            for (let px = 0; px < PART_SIZE; px++) {
                const xPos = partX + px
                const yPos = partY + py
                if (xPos < 0 || xPos >= WIDTH || yPos < 0 || yPos >= HEIGHT)
                    continue
                const imgI = (yPos * WIDTH + xPos) * 4
                const colorI = (py * PART_SIZE + px) * 4
                frameBuffer.data[imgI] = part.colors[colorI]
                frameBuffer.data[imgI + 1] = part.colors[colorI + 1]
                frameBuffer.data[imgI + 2] = part.colors[colorI + 2]
                frameBuffer.data[imgI + 3] = part.colors[colorI + 3]
            }
        }
    }
    updateMouseRadius() {
        this.mouse.radiusSq -= this.mouse.radiusSq ** 0.5 * RADIUS_DECAY
        if (this.mouse.radiusSq < 1) this.mouse.radiusSq = 1
    }
    checkImgSwitch() {
        const usingNextCount = this.parts.filter((p) => p.usingNextImg).length
        if (usingNextCount / this.parts.length > SWITCH_THRESHOLD) {
            this.lastSwitchTime = performance.now()
            this.parts.forEach((part) => {
                part.useNextImgColor()
                part.usingNextImg = false
            })
            this.nextImgI = (this.nextImgI + 1) % this.totalImgs
        }
    }
}
class Particle {
    constructor(effect, x, y, colors, i) {
        this.effect = effect
        this.usingNextImg = false
        this.originX = Math.floor(x)
        this.originY = Math.floor(y)
        this.x = this.originX
        this.y = this.originY
        this.colors = colors
        this.i = i
        this.vx = 0
        this.vy = 0
        this.ease = 0.05
        this.friction = 0.8
        this.dx = 0
        this.dy = 0
        this.distanceSquared = 0
        this.force = 0
        this.angle = 0
    }
    update() {
        // calculate mouse forces
        this.dx = this.effect.mouse.x - this.x
        this.dy = this.effect.mouse.y - this.y
        this.distanceSquared = this.dx ** 2 + this.dy ** 2
        this.distanceSquared = Math.max(this.distanceSquared, 0.1)
        if (this.distanceSquared < this.effect.mouse.radiusSq) {
            if (this.effect.lastSwitchTime + 1500 < performance.now()) {
                this.useNextImgColor()
                this.usingNextImg = true
            }
            this.force = -this.effect.mouse.radiusSq / this.distanceSquared
            this.angle = Math.atan2(this.dy, this.dx)
            this.vx += this.force * Math.cos(this.angle)
            this.vy += this.force * Math.sin(this.angle)
        }
        // apply motion
        this.vx *= this.friction
        this.vy *= this.friction
        this.x += this.vx + (this.originX - this.x) * this.ease
        this.y += this.vy + (this.originY - this.y) * this.ease
    }
    useNextImgColor() {
        this.colors = this.effect.partSets[this.effect.nextImgI][this.i].colors
    }
    clone() {
        return new Particle(
            this.effect,
            this.originX,
            this.originY,
            [...this.colors],
            this.i
        )
    }
}
