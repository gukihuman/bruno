window.addEventListener("load", function () {
    const canvas = document.getElementById("canvas1")
    const ctx = canvas.getContext("2d")
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    class Particle {
        constructor(effect, x, y, red, green, blue) {
            this.effect = effect
            this.x = Math.random() * this.effect.width
            this.y = Math.random() * this.effect.height
            this.originX = Math.floor(x)
            this.originY = Math.floor(y)
            this.red = red
            this.green = green
            this.blue = blue
            this.size = this.effect.gap
            this.vx = 0
            this.vy = 0
            this.ease = 0.05
            this.friction = 0.8
            this.dx = 0
            this.dy = 0
            this.distance = 0
            this.force = 0
            this.angle = 0
        }
        update() {
            this.dx = this.effect.mouse.x - this.x
            this.dy = this.effect.mouse.y - this.y
            this.distance = this.dx ** 2 + this.dy ** 2
            this.distance = Math.max(this.distance, 0.1)

            if (this.distance < this.effect.mouse.radius) {
                this.force = -this.effect.mouse.radius / this.distance
                this.angle = Math.atan2(this.dy, this.dx)
                this.vx += this.force * Math.cos(this.angle)
                this.vy += this.force * Math.sin(this.angle)
            }

            this.x +=
                (this.vx *= this.friction) + (this.originX - this.x) * this.ease
            this.y +=
                (this.vy *= this.friction) + (this.originY - this.y) * this.ease
        }
        warp() {
            this.x = Math.random() * this.effect.width
            this.y = Math.random() * this.effect.height
        }
    }
    class Effect {
        constructor(width, height) {
            this.width = width
            this.height = height
            this.particlesArray = []
            this.image = document.getElementById("image1")
            this.centerX = this.width * 0.5
            this.centerY = this.height * 0.5
            this.x = this.centerX - this.image.width * 0.5
            this.y = this.centerY - this.image.height * 0.5
            this.gap = 3
            this.mouse = {
                fullRadius: 50 ** 2,
                radius: 1,
                x: undefined,
                y: undefined,
                targetX: undefined,
                targetY: undefined,
                ease: 0.1,
            }
            window.addEventListener("mousemove", (event) => {
                this.mouse.targetX = event.x
                this.mouse.targetY = event.y
            })
            window.addEventListener("touchmove", (event) => {
                this.mouse.targetX = event.touches[0].clientX
                this.mouse.targetY = event.touches[0].clientY
            })
        }
        init(ctx) {
            ctx.drawImage(this.image, this.x, this.y)
            const pixels = ctx.getImageData(0, 0, this.width, this.height).data
            for (let y = 0; y < this.height; y += this.gap) {
                for (let x = 0; x < this.width; x += this.gap) {
                    const index = (y * this.width + x) * 4
                    const red = pixels[index]
                    const green = pixels[index + 1]
                    const blue = pixels[index + 2]
                    const alpha = pixels[index + 3]
                    if (alpha > 0) {
                        this.particlesArray.push(
                            new Particle(this, x, y, red, green, blue)
                        )
                    }
                }
            }
        }
        draw(ctx) {
            const imageData = ctx.createImageData(this.width, this.height)
            const data = imageData.data
            this.particlesArray.forEach((particle) => {
                const x = Math.round(particle.x)
                const y = Math.round(particle.y)
                if (
                    x < 0 ||
                    x > this.width - this.gap ||
                    y < 0 ||
                    y > this.height - this.gap
                ) {
                    return
                }
                for (let i = 0; i < this.gap; i++) {
                    for (let j = 0; j < this.gap; j++) {
                        const index = ((y + j) * this.width + (x + i)) * 4
                        data[index] = particle.red
                        data[index + 1] = particle.green
                        data[index + 2] = particle.blue
                        data[index + 3] = 255
                    }
                }
            })
            ctx.putImageData(imageData, 0, 0)
        }
        update() {
            if (!this.mouse.x && !this.mouse.y) {
                this.mouse.x = this.mouse.targetX
                this.mouse.y = this.mouse.targetY
            }
            const dx = this.mouse.targetX - this.mouse.x
            const dy = this.mouse.targetY - this.mouse.y
            this.mouse.x += dx * this.mouse.ease
            this.mouse.y += dy * this.mouse.ease
            if (
                (Math.abs(dx) > 1 || Math.abs(dy) > 1) &&
                this.mouse.radius < this.mouse.fullRadius
            ) {
                this.mouse.radius += this.mouse.radius ** 0.5 * 5
            } else if (this.mouse.radius > 1) {
                this.mouse.radius -= this.mouse.radius ** 0.5 * 2
            } else {
                this.mouse.radius = 1
            }
            this.particlesArray.forEach((particle) => particle.update())
        }
        warp() {
            this.particlesArray.forEach((particle) => particle.warp())
        }
    }
    const effect = new Effect(canvas.width, canvas.height)
    effect.init(ctx)
    let frameTimes = [] // <<
    let frameCount = 0 // <<
    function animate() {
        const startTime = performance.now() // <<
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        effect.draw(ctx)
        effect.update()
        const endTime = performance.now() // <<
        const frameTime = endTime - startTime // <<
        frameTimes.push(frameTime) // <<
        frameCount++ // <<
        if (frameCount >= 60) {
            const averageFrameTime =
                frameTimes.reduce((sum, time) => sum + time, 0) /
                frameTimes.length
            // console.log(`Average frame time: ${averageFrameTime.toFixed(2)}ms`)
            frameTimes = []
            frameCount = 0
        } // <<
        requestAnimationFrame(animate)
    }
    animate()

    const warpButton = document.getElementById("warpButton")
    warpButton.addEventListener("click", function () {
        effect.warp()
    })
})
