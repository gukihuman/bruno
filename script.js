/*
  ptcl - particle
  pxl - pixel
*/
window.addEventListener("load", function () {
    const effect = new Effect()
    const performanceMonitor = new PerformanceMonitor(60)
    function animate() {
        performanceMonitor.start()
        effect.update()
        performanceMonitor.end()
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
class Particle {
    constructor(effect, x, y, colors, i) {
        this.effect = effect
        this.fromNext = false
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
        this.dx = this.effect.mouse.x - this.x
        this.dy = this.effect.mouse.y - this.y
        this.distanceSquared = this.dx ** 2 + this.dy ** 2
        this.distanceSquared = Math.max(this.distanceSquared, 0.1)
        if (this.distanceSquared < this.effect.mouse.radiusSquared) {
            if (this.effect.transitionTimestamp + 1500 < performance.now()) {
                this.updateColor()
                this.fromNext = true
            }
            this.force = -this.effect.mouse.radiusSquared / this.distanceSquared
            this.angle = Math.atan2(this.dy, this.dx)
            this.vx += this.force * Math.cos(this.angle)
            this.vy += this.force * Math.sin(this.angle)
        }
        this.vx *= this.friction
        this.vy *= this.friction
        this.x += this.vx + (this.originX - this.x) * this.ease
        this.y += this.vy + (this.originY - this.y) * this.ease
    }
    updateColor() {
        this.colors =
            this.effect.ptclsStorage[this.effect.nextImg][this.i].colors
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
class Effect {
    static PTCL_SIZE = 20
    static SWITCH_THRESHOLD = 0.85
    static RADIUS_GROWTH = 5
    static RADIUS_DECAY = 2
    constructor() {
        this.canvas = document.getElementsByTagName("canvas")[0]
        this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })
        this.edge = 60
        this.canvas.width = 420 + this.edge * 2
        this.canvas.height = 660 + this.edge * 2
        this.w = this.canvas.width
        this.h = this.canvas.height
        this.ptclsStorage = []
        this.ptclsArray = []
        this.imgsLength = undefined
        this.nextImg = 1
        this.transitionTimestamp = 0
        this.mouse = {
            fullRadiusSquared: 50 ** 2,
            radiusSquared: 1,
            x: undefined,
            y: undefined,
        }
        this.firstMoveDispatched = false
        const imgs = document.getElementsByTagName("img")
        this.imgsLength = imgs.length
        for (let i = 0; i < this.imgsLength; i++) {
            this.ptclsStorage[i] = []
            this.ctx.drawImage(imgs[0], this.edge, this.edge)
            const pxls = this.ctx.getImageData(0, 0, this.w, this.h).data
            for (let ptclY = 0; ptclY < this.h; ptclY += Effect.PTCL_SIZE) {
                for (let ptclX = 0; ptclX < this.w; ptclX += Effect.PTCL_SIZE) {
                    const ptclDataI = (ptclY * this.w + ptclX) * 4
                    const colors = []
                    let allAlphaTransparent = true
                    for (let pxlY = 0; pxlY < Effect.PTCL_SIZE; pxlY++) {
                        for (let pxlX = 0; pxlX < Effect.PTCL_SIZE; pxlX++) {
                            const pxlI = ptclDataI + (pxlY * this.w + pxlX) * 4
                            if (pxls[pxlI + 3] === 0) continue
                            allAlphaTransparent = false
                            colors.push(pxls[pxlI])
                            colors.push(pxls[pxlI + 1])
                            colors.push(pxls[pxlI + 2])
                            colors.push(pxls[pxlI + 3])
                        }
                    }
                    if (allAlphaTransparent) continue
                    this.ptclsStorage[i].push(
                        new Particle(
                            this,
                            ptclX,
                            ptclY,
                            colors,
                            this.ptclsStorage[i].length
                        )
                    )
                }
            }
            imgs[0].remove()
        }

        this.ptclsArray = this.ptclsStorage[0].map((particle) =>
            particle.clone()
        )
        this.canvas.style.display = "block"
        window.addEventListener("mousemove", this.handleMove.bind(this))
        window.addEventListener("touchmove", this.handleMove.bind(this))
        this.canvas.addEventListener("firstmove", () => {
            document.getElementById("touchHint").remove()
        })
    }
    handleMove(event) {
        this.mouse.x = event.touches ? event.touches[0].clientX : event.clientX
        this.mouse.y = event.touches ? event.touches[0].clientY : event.clientY
        const clientRect = this.canvas.getBoundingClientRect()
        const scaleRatio = this.w / clientRect.width
        this.mouse.x = (this.mouse.x - clientRect.left) * scaleRatio
        this.mouse.y = (this.mouse.y - clientRect.top) * scaleRatio
        if (this.mouse.radiusSquared < this.mouse.fullRadiusSquared) {
            this.mouse.radiusSquared +=
                this.mouse.radiusSquared ** 0.5 * Effect.RADIUS_GROWTH
        }
        if (!this.firstMoveDispatched) {
            this.canvas.dispatchEvent(new CustomEvent("firstmove"))
            this.firstMoveDispatched = true
        }
    }
    update() {
        this.ctx.clearRect(0, 0, this.w, this.h)
        const imgData = this.ctx.createImageData(this.w, this.h)
        this.ptclsArray.forEach((ptcl) => {
            const ptclX = Math.round(ptcl.x)
            const ptclY = Math.round(ptcl.y)
            for (let pxlY = 0; pxlY < Effect.PTCL_SIZE; pxlY++) {
                for (let pxlX = 0; pxlX < Effect.PTCL_SIZE; pxlX++) {
                    if (
                        ptclX + pxlX < 0 ||
                        ptclX + pxlX >= this.w ||
                        ptclY + pxlY < 0 ||
                        ptclY + pxlY >= this.h
                    ) {
                        continue
                    }
                    const pxlI = ((ptclY + pxlY) * this.w + (ptclX + pxlX)) * 4
                    let colorI = (pxlY * Effect.PTCL_SIZE + pxlX) * 4
                    imgData.data[pxlI] = ptcl.colors[colorI]
                    imgData.data[pxlI + 1] = ptcl.colors[colorI + 1]
                    imgData.data[pxlI + 2] = ptcl.colors[colorI + 2]
                    imgData.data[pxlI + 3] = ptcl.colors[colorI + 3]
                }
            }
        })
        this.ctx.putImageData(imgData, 0, 0)
        this.mouse.radiusSquared -=
            this.mouse.radiusSquared ** 0.5 * Effect.RADIUS_DECAY
        if (this.mouse.radiusSquared < 1) this.mouse.radiusSquared = 1
        let fromNextCounter = 0
        this.ptclsArray.forEach((ptcl) => {
            ptcl.update()
            if (ptcl.fromNext) fromNextCounter++
        })
        if (
            fromNextCounter / this.ptclsArray.length >
            Effect.SWITCH_THRESHOLD
        ) {
            this.transitionTimestamp = performance.now()
            this.ptclsArray.forEach((ptcl) => {
                ptcl.fromNext = false
                ptcl.updateColor()
            })
            this.nextImg = (this.nextImg + 1) % this.imgsLength
        }
    }
}
