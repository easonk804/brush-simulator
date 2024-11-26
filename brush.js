class BrushSimulator {
    /* 
    用于模拟笔刷的类
    */

    // 常量配置
    static DISTANCE_THRESHOLDS = {
        MIN: 10,    // 最小距离阈值，用于决定使用贝塞尔曲线
        MEDIUM: 200, // 中等距离阈值，用于决定使用二次贝塞尔曲线
        MAX: 400    // 最大距离阈值，用于决定是否丢弃点
    };

    static TEMP_CANVAS = document.createElement('canvas');
    static TEMP_CTX = BrushSimulator.TEMP_CANVAS.getContext('2d');

    constructor(canvas) {
        /* 构造器 */

        // 获取基本元素
        this.canvas = canvas; 
        this.ctx = canvas.getContext('2d'); 

        // 鼠标绘画控制参数
        this.isDrawing = false;
        this.mouseDown = false;

        // 笔触参数
        this.params = {
            ax: 0, // X轴加速度
            alpha: 0, // X轴旋转角
            ay: 0, // Y轴加速度
            theta: 0, // Y轴旋转角
            az: 0, // Z轴加速度
            beta: 0, // Z轴旋转角
            deltaL: 0, // l2-l1 
            minWidth: 2, // 最小笔触宽度
            maxWidth: 10, // 最大笔触宽度
            width: 6, // 当前笔触宽度（初始值设为最小和最大宽度的中间值）
            pressure: 0.5 // 压力
        };

        // 笔刷/橡皮擦设置
        this.isEraser = false; // 默认不使用橡皮擦
        this.color = `rgba(0, 0, 0, 1)`;  // 笔刷颜色
        this.eraserColor = `rgba(255, 255, 255, 1)`; // 橡皮擦颜色

        // 存储路径和触摸点
        this.totalPath = new Path2D(); // 总路径
        this.touchPointList = []; // 触摸点列表
        this.segPathList = []; // 段路径列表
        this.drawPath = new Path2D(); // 当前绘制路径
        this.last = { x: 0, y: 0 }; // 上一个点
        this.mid = { x: 0, y: 0 }; // 中间点
        this.cx = 0; // 当前X坐标
        this.cy = 0; // 当前Y坐标
        
        this.ratio = 1.0; // 粗细比率
        this.paint = { strokeWidth: this.params.width }; // 初始画笔设置

        // 添加缓存
        this.pathCache = new Map(); // 缓存路径计算结果

        // 设置监听事件
        this.setupListeners();

        // 绑定绘画事件的this上下文
        this.draw = this.draw.bind(this);
        this.startDrawing = this.startDrawing.bind(this);
        this.stopDrawing = this.stopDrawing.bind(this);

        // 添加画布尺寸变化监听
        const resizeObserver = new ResizeObserver(() => this.handleCanvasResize());
        resizeObserver.observe(canvas);

        // 添加调试信息
        console.log('BrushSimulator initialized');
    }

    static getTempContext() {
        /* 获取临时画布上下文的方法 */

        if (!BrushSimulator.TEMP_CTX) {
            BrushSimulator.TEMP_CTX = BrushSimulator.TEMP_CANVAS.getContext('2d');
        }
        return BrushSimulator.TEMP_CTX;
    }

    static clearTempCanvas() {
        /* 清理临时画布的方法 */

        const ctx = BrushSimulator.getTempContext();
        ctx.clearRect(0, 0, BrushSimulator.TEMP_CANVAS.width, BrushSimulator.TEMP_CANVAS.height);
    }

    handleCanvasResize() {
        /* 处理画布尺寸变化的方法 */

        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // 重新设置画布上下文属性
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // 清理缓存
        this.pathCache.clear();
    }

    setupListeners() {
        /* 设置监听事件的方法 */

        // 鼠标左键按下事件 
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                this.mouseDown = true;
                this.startDrawing(e);
            }
        });

        // 鼠标左键移动事件
        this.canvas.addEventListener('mousemove', (e) => {
            if (!this.mouseDown) return; 
            this.draw(e);
        })

        // 鼠标左键松开事件（在document级别监听mouseup）
        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.stopDrawing();
            }
        })

        // 鼠标离开画布事件
        this.canvas.addEventListener('mouseleave', () => {
            this.mouseDown = false;
            this.isDrawing = false;
            console.log("Mouse left canvas");
        })
    }

    draw(e) {
        /* 
        主要功能：
        - 更新当前位置
        - 计算笔触效果
        - 使用插值绘制平滑的线条

        参数）
        - e: 鼠标事件
        */
        
        // 检查绘画状态
        if (!this.isDrawing) return;

        // 获取画布在视口中的位置
        const rect = this.canvas.getBoundingClientRect(); 
        // 计算鼠标在画布内的X坐标
        const x = e.clientX - rect.left; 
        // 计算鼠标在画布内的Y坐标
        const y = e.clientY - rect.top; 

        // 传入当前坐标和鼠标状态
        this.setCurrent(x, y);

        // 计算笔触效果
        const brushEffect = this.calculateBrushEffect(); 

        // 使用插值绘制平滑的线条
        this.drawTo(this.canvas, brushEffect);

        // 更新笔触位置
        this.last = {x, y};
    }

    startDrawing(e) {
        /* 
        主要功能：开始绘画控制

        参数）
        - e: 鼠标事件
        */

        // 修改绘画控制参数
        if (!this.mouseDown) return;
        this.isDrawing = true;

        // 获取起始点坐标
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 初始化起始点
        this.last = {x, y};
        this.drawPath = new Path2D();
        this.drawPath.moveTo(x, y);
        this.segPathList.push(this.drawPath);

        // 清空触摸点列表，准备新的绘制
        this.touchPointList = [{x, y}];

        console.log("Drawing started at: ", x, y);
    }

    stopDrawing() {
        /* 
        主要功能：结束绘画控制

        参数）
        - e: 鼠标事件
        */

        // 修改绘画控制参数
        this.mouseDown = false;
        this.isDrawing = false;
        
        console.log("Drawing stopped manually");
    }

    setCurrent(x, y) {
        /* 
        主要功能：更新当前位置

        参数）
        - x: X坐标
        - y: Y坐标
        */

        if (!this.isDrawing) return;

        this.touchPointList.push({x, y});
        
        // 如果是第一个点，创建新的路径
        if (this.touchPointList.length === 1) {
            this.drawPath = new Path2D();
            this.drawPath.moveTo(x, y);
            this.totalPath.moveTo(x, y);
            this.segPathList.push(this.drawPath); // 添加到段路径列表
            this.last = {x, y};
            return;
        }

        // 计算距离
        const distance = Math.hypot(x - this.last.x, y - this.last.y);
        
        if (distance > BrushSimulator.DISTANCE_THRESHOLDS.MAX) {
            console.log("Point discarded due to excessive distance:", distance);
            return;
        }

        // 计算中间点
        const midPoint = {
            x: (x + this.last.x) / 2,
            y: (y + this.last.y) / 2
        };

        // 根据距离选择绘制方法
        if (distance < BrushSimulator.DISTANCE_THRESHOLDS.MIN) {
            this.drawPath.lineTo(x, y);
            this.totalPath.lineTo(x, y);
        } else {
            this.drawPath.quadraticCurveTo(this.last.x, this.last.y, midPoint.x, midPoint.y);
            this.totalPath.quadraticCurveTo(this.last.x, this.last.y, midPoint.x, midPoint.y);
        }
    }

    drawTo(canvas, brushEffect) {
        /* 
        主要功能: 
        - 绘制路径
        - 应用笔刷效果

        参数）
        - canvas: 画布
        - brushEffect: 笔触效果（可选，如果未提供则使用calculateBrushEffect计算）
        */

        if (!this.drawPath) return;

        // 获取笔刷效果，如果未提供则计算
        const effect = brushEffect || this.calculateBrushEffect();
        const {width, angle, pressure} = effect;
        
        // 设置基本绘制属性
        const ctx = canvas.getContext('2d');
        ctx.save();

        // 设置画笔样式
        ctx.strokeStyle = this.isEraser ? this.eraserColor : this.color;
        if (this.isEraser) {
            ctx.globalCompositeOperation = 'destination-out';
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }
        
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 应用画笔旋转
        if (angle !== 0 && this.touchPointList.length > 0) {
            // 使用触摸点列表计算中心点
            const points = this.touchPointList;
            let minX = Infinity, minY = Infinity;
            let maxX = -Infinity, maxY = -Infinity;
            
            points.forEach(point => {
                minX = Math.min(minX, point.x);
                minY = Math.min(minY, point.y);
                maxX = Math.max(maxX, point.x);
                maxY = Math.max(maxY, point.y);
            });
            
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            ctx.translate(-centerX, -centerY);
        }

        // 直接绘制当前路径
        ctx.stroke(this.drawPath);
        ctx.restore();
    }

    calculateBrushEffect() {
        /* 
        主要功能：计算笔触效果

        返回值）
        - width: 笔触宽度
        - angle: 笔触旋转角度
        - pressure: 压力效果
        - tilt: 倾斜效果
        */

        // 将各个轴的旋转角度转换为弧度
        const alphaRad = this.params.alpha * Math.PI / 180;
        const thetaRad = this.params.theta * Math.PI / 180;
        const betaRad = this.params.beta * Math.PI / 180;
        
        // 计算笔尖在平面上的投影效果
        const tiltEffect = Math.sqrt(
            Math.pow(Math.sin(alphaRad), 2) + 
            Math.pow(Math.sin(thetaRad), 2)
        );

        // 压力效果（基于z轴加速度和倾斜）
        const pressureEffect = Math.min(
            (Math.abs(this.params.az) / 10 + tiltEffect) / 2,
            1
        );
        
        // 方向效果（影响笔触的方向）
        const directionAngle = Math.atan2(
            Math.sin(betaRad),
            Math.cos(betaRad) * Math.cos(alphaRad)
        );

        // 计算最终笔触宽度（考虑压力、倾斜和deltaL的综合效果）
        const deltaLEffect = Math.min(Math.abs(this.params.deltaL) / 10, 1); // 归一化deltaL效果
        const width = this.params.minWidth + 
            (this.params.maxWidth - this.params.minWidth) * 
            (tiltEffect * 0.3 + pressureEffect * 0.3 + deltaLEffect * 0.4); // 加权组合各种效果

        return {
            width,
            angle: directionAngle,
            pressure: pressureEffect,
            tilt: tiltEffect
        };
    }

    toggleEraser() {
        /* 切换橡皮擦模式 */

        this.isEraser = !this.isEraser;
        if (this.isEraser) {
            this._savedColor = this.color;
            this.color = this.eraserColor;
        } else {
            this.color = this._savedColor;
        }
        console.log('Eraser mode:', this.isEraser);
    }

    hexToRgb(hex) {
        /* 
        主要功能：将十六进制颜色转换为 RGB 值

        参数）
        - hex: 十六进制颜色字符串（#RRGGBB）

        返回值）
        - r: 红色值
        - g: 绿色值
        - b: 蓝色值
        */

        // 去掉可能的前缀 #
        hex = hex.replace(/^#/, '');

        // 如果是短格式（#RGB），则扩展为长格式（#RRGGBB）
        if (hex.length === 3) {
            hex = hex.split('').map(function(hex) {
                return hex + hex;
            }).join('');
        }
        
        // 解析 R、G、B值
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return { r, g, b };
    }

    updateColor(newColor) {
        /* 
        主要功能：更新笔刷颜色

        参数）
        - newColor: 新的十六进制颜色字符串
        */

        console.log(newColor);
        const { r, g, b } = this.hexToRgb(newColor);
        this.color = `rgba(${r}, ${g}, ${b}, 1)`;
        const rgbaMatch = this.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
        console.log(rgbaMatch);
    }

    updateParams(params) {
        /* 
        主要功能：更新笔触参数

        参数）
        - params: 参数对象
        */

        // 参数验证
        if (params.width !== undefined) {
            params.width = Math.max(params.minWidth || this.params.minWidth,
                Math.min(params.width, params.maxWidth || this.params.maxWidth));
        }
        if (params.pressure !== undefined) {
            params.pressure = Math.max(0, Math.min(params.pressure, 1));
        }
        
        // 更新参数
        Object.assign(this.params, params);
        
        // 重新计算效果
        const effect = this.calculateBrushEffect();
        this.paint.strokeWidth = effect.width;
    }

    clearCache() {
        /* 清除缓存的方法 */
        
        if (this.pathCache.size > BrushSimulator.MAX_CACHE_SIZE) {
            const entriesToRemove = [...this.pathCache.entries()]
                .slice(0, this.pathCache.size - BrushSimulator.MAX_CACHE_SIZE);
            entriesToRemove.forEach(([key]) => this.pathCache.delete(key));
        }
    }

    debugDraw() {
        /* 调试的方法 */
        console.log('当前笔触参数：', {
            width: this.params.width,
            mindWidth: this.params.minWidth,
            maxWidth: this.params.maxWidth,
            pressure: this.params.pressure,
            alpha: this.params.alpha,
            theta: this.params.theta,
            beta: this.params.beta
        });
        
        const effect = this.calculateBrushEffect();
        console.log("计算后的笔触效果：", effect);
    }
}