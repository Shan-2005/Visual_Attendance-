// VisionAttend AI - Frontend Engine
document.addEventListener("DOMContentLoaded", () => {
    // State management
    const state = {
        activeTab: "tab-monitor",
        webcamStream: null,
        isProcessingFrame: false,
        processingInterval: null,
        selectedCategory: "authorized",
        burstInProgress: false,
        allRecords: [],
        galleryTab: "authorized",
        tmModel: null,
        isTmActive: false,
        lastTmMarkTime: 0,
        isCameraMirrored: true
    };

    // DOM Elements
    const elements = {
        flipCameraBtn: document.getElementById("flipCameraBtn"),
        // Navigation
        navItems: document.querySelectorAll(".nav-item"),
        tabPanes: document.querySelectorAll(".tab-pane"),
        pageTitle: document.getElementById("pageTitle"),
        currentTime: document.getElementById("currentTime"),
        currentDate: document.getElementById("currentDate"),

        // Metrics
        statTotalStudents: document.getElementById("statTotalStudents"),
        statPresentToday: document.getElementById("statPresentToday"),
        statAbsentToday: document.getElementById("statAbsentToday"),
        statDatasetTotal: document.getElementById("statDatasetTotal"),
        statPresentRate: document.getElementById("statPresentRate"),
        sidebarSampleCount: document.getElementById("sidebarSampleCount"),
        headerPresentCount: document.getElementById("headerPresentCount"),
        headerTotalCount: document.getElementById("headerTotalCount"),

        // AI Model Info
        aiStatusBadge: document.getElementById("aiStatusBadge"),
        aiStatusText: document.getElementById("aiStatusText"),
        aiAccuracyVal: document.getElementById("aiAccuracyVal"),
        aiClassesVal: document.getElementById("aiClassesVal"),

        // Live Monitoring Viewport
        webcamVideo: document.getElementById("webcamVideo"),
        overlayCanvas: document.getElementById("overlayCanvas"),
        toggleWebcamBtn: document.getElementById("toggleWebcamBtn"),
        webcamBtnText: document.getElementById("webcamBtnText"),
        cameraPlaceholder: document.getElementById("cameraPlaceholder"),
        retryCameraBtn: document.getElementById("retryCameraBtn"),
        monitorStatusText: document.getElementById("monitorStatusText"),
        detectedFacesList: document.getElementById("detectedFacesList"),
        recentMarksList: document.getElementById("recentMarksList"),
        liveDetectCount: document.getElementById("liveDetectCount"),
        uploadTestImageBtn: document.getElementById("uploadTestImageBtn"),
        testImageFileInput: document.getElementById("testImageFileInput"),

        // Security Alert Banner
        unauthorizedAlertBanner: document.getElementById("unauthorizedAlertBanner"),
        alertBannerText: document.getElementById("alertBannerText"),
        closeAlertBtn: document.getElementById("closeAlertBtn"),

        // Dataset Creator
        datasetVideo: document.getElementById("datasetVideo"),
        datasetCanvas: document.getElementById("datasetCanvas"),
        btnClass1: document.getElementById("btnClass1"),
        btnClass2: document.getElementById("btnClass2"),
        authorizedStudentFields: document.getElementById("authorizedStudentFields"),
        unauthorizedHint: document.getElementById("unauthorizedHint"),
        studentIdInput: document.getElementById("studentIdInput"),
        studentNameInput: document.getElementById("studentNameInput"),
        studentDeptInput: document.getElementById("studentDeptInput"),
        singleCaptureBtn: document.getElementById("singleCaptureBtn"),
        burstCaptureBtn: document.getElementById("burstCaptureBtn"),
        uploadDatasetBtn: document.getElementById("uploadDatasetBtn"),
        datasetFileInput: document.getElementById("datasetFileInput"),
        datasetUploadStatus: document.getElementById("datasetUploadStatus"),
        burstProgressBox: document.getElementById("burstProgressBox"),
        burstProgressBar: document.getElementById("burstProgressBar"),
        burstProgressText: document.getElementById("burstProgressText"),
        datasetClass1Count: document.getElementById("datasetClass1Count"),
        datasetClass2Count: document.getElementById("datasetClass2Count"),
        datasetTotalCount: document.getElementById("datasetTotalCount"),

        // Model & Gallery
        modelStatusHeader: document.getElementById("modelStatusHeader"),
        modelAccuracyHeader: document.getElementById("modelAccuracyHeader"),
        modelSamplesHeader: document.getElementById("modelSamplesHeader"),
        modelLastTrainedHeader: document.getElementById("modelLastTrainedHeader"),
        startTrainModelBtn: document.getElementById("startTrainModelBtn"),
        loadDemoDataBtn: document.getElementById("loadDemoDataBtn"),
        trainNotification: document.getElementById("trainNotification"),
        galleryContainer: document.getElementById("galleryContainer"),
        galleryTabBtns: document.querySelectorAll(".btn-tab"),

        // Teachable Machine Connector Elements
        tmModelUrlInput: document.getElementById("tmModelUrlInput"),
        loadTmModelBtn: document.getElementById("loadTmModelBtn"),
        loadDemoTmModelBtn: document.getElementById("loadDemoTmModelBtn"),
        tmStatusBadge: document.getElementById("tmStatusBadge"),
        tmLiveBars: document.getElementById("tmLiveBars"),
        tmProbClass1: document.getElementById("tmProbClass1"),
        tmProbClass1Val: document.getElementById("tmProbClass1Val"),
        tmProbClass2: document.getElementById("tmProbClass2"),
        tmProbClass2Val: document.getElementById("tmProbClass2Val"),

        // Records & Logs
        attendanceTableBody: document.getElementById("attendanceTableBody"),
        recordSearchInput: document.getElementById("recordSearchInput"),
        filterDateInput: document.getElementById("filterDateInput"),
        clearDateFilterBtn: document.getElementById("clearDateFilterBtn"),
        securityAlertsList: document.getElementById("securityAlertsList"),
        alertsCountBadge: document.getElementById("alertsCountBadge"),

        // Quick Enroll Modal
        openQuickCaptureBtn: document.getElementById("openQuickCaptureBtn"),
        enrollModal: document.getElementById("enrollModal"),
        closeEnrollModalBtn: document.getElementById("closeEnrollModalBtn"),
        cancelEnrollBtn: document.getElementById("cancelEnrollBtn"),
        saveEnrollBtn: document.getElementById("saveEnrollBtn"),
        modalStudentId: document.getElementById("modalStudentId"),
        modalStudentName: document.getElementById("modalStudentName"),
        modalStudentDept: document.getElementById("modalStudentDept"),

        // Global Sync
        refreshStatsBtn: document.getElementById("refreshStatsBtn")
    };

    // -------------------------------------------------------------
    // Web Audio Synthesizer (Zero External Dependencies)
    // -------------------------------------------------------------
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;

    function playBeep(type = "success") {
        try {
            if (!audioCtx) audioCtx = new AudioContextClass();
            if (audioCtx.state === "suspended") audioCtx.resume();

            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            const now = audioCtx.currentTime;

            if (type === "success") {
                // Pleasant rising double chime
                osc.type = "sine";
                osc.frequency.setValueAtTime(587.33, now); // D5
                osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.15); // A5
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === "alert") {
                // Urgent dual alarm beep
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(400, now);
                osc.frequency.linearRampToValueAtTime(850, now + 0.12);
                osc.frequency.linearRampToValueAtTime(400, now + 0.25);
                gain.gain.setValueAtTime(0.25, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        } catch (err) {
            console.warn("Audio feedback error:", err);
        }
    }

    // -------------------------------------------------------------
    // Clock & System Info
    // -------------------------------------------------------------
    function updateClock() {
        const now = new Date();
        elements.currentTime.textContent = now.toLocaleTimeString();
        elements.currentDate.textContent = now.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }
    setInterval(updateClock, 1000);
    updateClock();

    // -------------------------------------------------------------
    // Navigation & Tabs
    // -------------------------------------------------------------
    const tabTitles = {
        "tab-monitor": "Classroom Live Attendance Monitor",
        "tab-dataset": "Camera-Based Dataset Creation Studio",
        "tab-model": "AI Model Training & Dataset Gallery",
        "tab-records": "Classroom Attendance Records & Security Audit"
    };

    function switchTab(tabId) {
        state.activeTab = tabId;

        elements.navItems.forEach(item => {
            if (item.getAttribute("data-tab") === tabId) {
                item.classList.add("active");
            } else {
                item.classList.remove("active");
            }
        });

        elements.tabPanes.forEach(pane => {
            if (pane.id === tabId) {
                pane.classList.add("active");
            } else {
                pane.classList.remove("active");
            }
        });

        elements.pageTitle.textContent = tabTitles[tabId] || "AI Attendance System";

        // Refresh tab-specific data
        if (tabId === "tab-records") loadAttendanceLogs();
        if (tabId === "tab-model") loadModelAndGallery();
        if (tabId === "tab-dataset") fetchDatasetStats();
    }

    elements.navItems.forEach(item => {
        item.addEventListener("click", () => {
            switchTab(item.getAttribute("data-tab"));
        });
    });

    // -------------------------------------------------------------
    // Webcam Management (Single Stream Shared Between Tabs)
    // -------------------------------------------------------------
    async function startCamera() {
        try {
            if (state.webcamStream) return;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: "user"
                },
                audio: false
            });

            state.webcamStream = stream;
            elements.webcamVideo.srcObject = stream;
            elements.datasetVideo.srcObject = stream;

            elements.cameraPlaceholder.style.display = "none";
            elements.webcamBtnText.textContent = "Stop Camera";
            elements.monitorStatusText.textContent = "Classroom camera active. Scanning faces...";

            // Start detection loop
            startLiveInferenceLoop();
        } catch (err) {
            console.error("Camera access error:", err);
            elements.cameraPlaceholder.style.display = "flex";
            elements.webcamBtnText.textContent = "Start Camera";
            elements.monitorStatusText.textContent = "Camera unavailable or access denied.";
        }
    }

    function stopCamera() {
        if (state.webcamStream) {
            state.webcamStream.getTracks().forEach(track => track.stop());
            state.webcamStream = null;
        }
        elements.webcamVideo.srcObject = null;
        elements.datasetVideo.srcObject = null;
        elements.cameraPlaceholder.style.display = "flex";
        elements.webcamBtnText.textContent = "Start Camera";
        elements.monitorStatusText.textContent = "Camera stopped.";

        if (state.processingInterval) {
            clearInterval(state.processingInterval);
            state.processingInterval = null;
        }

        // Clear canvas
        const ctx = elements.overlayCanvas.getContext("2d");
        ctx.clearRect(0, 0, elements.overlayCanvas.width, elements.overlayCanvas.height);
    }

    elements.toggleWebcamBtn.addEventListener("click", () => {
        if (state.webcamStream) stopCamera();
        else startCamera();
    });

    elements.retryCameraBtn.addEventListener("click", startCamera);

    if (elements.flipCameraBtn) {
        elements.flipCameraBtn.addEventListener("click", () => {
            state.isCameraMirrored = !state.isCameraMirrored;
            elements.webcamVideo.style.transform = state.isCameraMirrored ? "scaleX(-1)" : "none";
            elements.datasetVideo.style.transform = state.isCameraMirrored ? "scaleX(-1)" : "none";
        });
    }

    // -------------------------------------------------------------
    // Real-Time Frame Capture & AI Inference Loop
    // -------------------------------------------------------------
    function captureVideoFrame(videoElement, scale = 0.8) {
        if (!videoElement || videoElement.videoWidth === 0) return null;

        const offCanvas = document.createElement("canvas");
        offCanvas.width = videoElement.videoWidth * scale;
        offCanvas.height = videoElement.videoHeight * scale;
        const ctx = offCanvas.getContext("2d");
        ctx.drawImage(videoElement, 0, 0, offCanvas.width, offCanvas.height);
        return offCanvas.toDataURL("image/jpeg", 0.75);
    }

    function startLiveInferenceLoop() {
        if (state.processingInterval) clearInterval(state.processingInterval);

        state.processingInterval = setInterval(async () => {
            // Only process if monitoring tab is visible and camera is streaming
            if (state.activeTab !== "tab-monitor" || !state.webcamStream || state.isProcessingFrame) {
                return;
            }

            state.isProcessingFrame = true;

            try {
                // Check if Teachable Machine model is active
                if (state.isTmActive && state.tmModel) {
                    const predictions = await state.tmModel.predict(elements.webcamVideo);
                    let class1Prob = 0;
                    let class2Prob = 0;

                    predictions.forEach((p, idx) => {
                        const name = p.className.toLowerCase();
                        // CRITICAL: Check unauthorized / Class 2 FIRST because "unauthorized" contains the substring "auth"!
                        if (name.includes("unauth") || name.includes("class 2") || name.includes("unknown") || name.includes("intruder")) {
                            class2Prob = p.probability;
                        } else if (name.includes("class 1") || name.includes("auth") || name.includes("student")) {
                            class1Prob = p.probability;
                        } else {
                            if (idx === 0) class1Prob = p.probability;
                            else class2Prob = p.probability;
                        }
                    });

                    // Update live probability meters
                    if (elements.tmProbClass1) {
                        elements.tmProbClass1.style.width = `${Math.round(class1Prob * 100)}%`;
                        elements.tmProbClass1Val.textContent = `${Math.round(class1Prob * 100)}%`;
                        elements.tmProbClass2.style.width = `${Math.round(class2Prob * 100)}%`;
                        elements.tmProbClass2Val.textContent = `${Math.round(class2Prob * 100)}%`;
                    }

                    renderTmDetection(class1Prob, class2Prob);

                    const now = Date.now();
                    if (class1Prob > 0.70 && (now - state.lastTmMarkTime > 6000)) {
                        state.lastTmMarkTime = now;
                        const sId = elements.studentIdInput ? elements.studentIdInput.value.trim() : "CS202401";
                        const sName = elements.studentNameInput ? elements.studentNameInput.value.trim() : "Authorized Student";
                        
                        const res = await fetch("/api/attendance/mark_tm", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ student_id: sId, name: sName, confidence: class1Prob })
                        });
                        const data = await res.json();
                        if (data.is_new) {
                            addRecentMarkItem(data.record);
                            playBeep("success");
                            fetchGlobalStats();
                        }
                    } else if (class2Prob > 0.80) {
                        const frameB64 = captureVideoFrame(elements.webcamVideo, 0.7);
                        fetch("/api/attendance/alert_tm", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ confidence: class2Prob, image: frameB64 })
                        });
                        triggerSecurityAlert("Unauthorized / Unknown Person detected via Teachable Machine!");
                    }
                } else {
                    // Local computer vision / PCA + SVM pipeline
                    const frameB64 = captureVideoFrame(elements.webcamVideo);
                    if (!frameB64) return;

                    const res = await fetch("/api/attendance/process_frame", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ image: frameB64, threshold: 0.58 })
                    });

                    if (res.ok) {
                        const data = await res.json();
                        renderDetections(data.detections || []);

                        if (data.newly_marked && data.newly_marked.length > 0) {
                            data.newly_marked.forEach(rec => addRecentMarkItem(rec));
                            if (data.newly_marked.some(r => r.status === "Present")) {
                                playBeep("success");
                            }
                            fetchGlobalStats();
                        }
                    }
                }
            } catch (err) {
                console.error("Frame inference error:", err);
            } finally {
                state.isProcessingFrame = false;
            }
        }, 320);
    }

    function renderDetections(detections) {
        const video = elements.webcamVideo;
        const canvas = elements.overlayCanvas;
        if (!video || video.videoWidth === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        elements.liveDetectCount.textContent = `${detections.length} Detected`;

        if (detections.length === 0) {
            elements.detectedFacesList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-face-smile"></i>
                    <p>Position face in front of the camera to detect attendance</p>
                </div>
            `;
            return;
        }

        // Scale factors if frame was scaled
        // detections bbox: [x, y, w, h] in frame coordinates
        // Since offCanvas scaled by 0.8:
        const scale = video.videoWidth / (canvas.width * 0.8);

        let listHtml = "";

        detections.forEach(det => {
            const [bx, by, bw, bh] = det.bbox.map(v => v * scale);
            const isAuth = det.is_authorized;
            const color = isAuth ? "#10B981" : "#EF4444";

            // Mirrored horizontal coordinate to align with mirrored camera feed
            const drawX = state.isCameraMirrored ? (canvas.width - (bx + bw)) : bx;

            // Draw bounding box
            ctx.lineWidth = 3;
            ctx.strokeStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.strokeRect(drawX, by, bw, bh);
            ctx.shadowBlur = 0;

            // Draw corner accents
            const cLen = 14;
            ctx.lineWidth = 4;
            // TL
            ctx.beginPath();
            ctx.moveTo(drawX, by + cLen);
            ctx.lineTo(drawX, by);
            ctx.lineTo(drawX + cLen, by);
            ctx.stroke();

            // TR
            ctx.beginPath();
            ctx.moveTo(drawX + bw - cLen, by);
            ctx.lineTo(drawX + bw, by);
            ctx.lineTo(drawX + bw, by + cLen);
            ctx.stroke();

            // Label background
            const labelText = isAuth ? `${det.label} (${Math.round(det.confidence * 100)}%)` : "UNAUTHORIZED";
            ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
            const textWidth = ctx.measureText(labelText).width;
            
            ctx.fillStyle = color;
            ctx.fillRect(drawX, by - 26, textWidth + 14, 26);

            // Label text (drawn left-to-right, completely legible)
            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(labelText, drawX + 7, by - 8);

            // Update UI list
            listHtml += `
                <div class="detection-pill ${isAuth ? 'auth' : 'unauth'}">
                    <div class="det-info">
                        <h4>${det.label}</h4>
                        <p>${det.student_id ? 'Roll: ' + det.student_id : (isAuth ? 'Authorized Student' : 'Class 2: Unknown Person')}</p>
                    </div>
                    <div class="det-confidence" style="color: ${color}">
                        ${Math.round(det.confidence * 100)}%
                    </div>
                </div>
            `;
        });

        elements.detectedFacesList.innerHTML = listHtml;
    }

    function addRecentMarkItem(student) {
        const existingEmpty = elements.recentMarksList.querySelector(".empty-state");
        if (existingEmpty) existingEmpty.remove();

        const isAuth = (student.status !== "Unauthorized");
        const icon = isAuth ? "fa-check" : "fa-user-clock";
        const statusText = isAuth ? "Marked Present" : "Unauthorized Person Logged";
        const avatarColor = isAuth ? "#10B981" : "#F59E0B";
        const avatarBg = isAuth ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)";

        const item = document.createElement("div");
        item.className = "mark-item";
        item.innerHTML = `
            <div class="mark-avatar" style="background: ${avatarBg}; color: ${avatarColor}">
                <i class="fa-solid ${icon}"></i>
            </div>
            <div class="mark-meta">
                <h5>${student.name}</h5>
                <p>${student.student_id ? 'ID: ' + student.student_id + ' • ' : ''}${statusText}</p>
            </div>
            <div class="mark-time">${student.time}</div>
        `;
        elements.recentMarksList.prepend(item);
    }

    function triggerSecurityAlert(message) {
        elements.alertBannerText.textContent = message;
        elements.unauthorizedAlertBanner.classList.remove("hidden");
        playBeep("alert");

        // Auto close after 7s
        setTimeout(() => {
            elements.unauthorizedAlertBanner.classList.add("hidden");
        }, 7000);
    }

    elements.closeAlertBtn.addEventListener("click", () => {
        elements.unauthorizedAlertBanner.classList.add("hidden");
    });

    // -------------------------------------------------------------
    // Camera-Based Dataset Creation Station
    // -------------------------------------------------------------
    elements.btnClass1.addEventListener("click", () => {
        state.selectedCategory = "authorized";
        elements.btnClass1.classList.add("active");
        elements.btnClass2.classList.remove("active");
        elements.authorizedStudentFields.style.display = "flex";
        elements.unauthorizedHint.style.display = "none";
    });

    elements.btnClass2.addEventListener("click", () => {
        state.selectedCategory = "unauthorized";
        elements.btnClass2.classList.add("active");
        elements.btnClass1.classList.remove("active");
        elements.authorizedStudentFields.style.display = "none";
        elements.unauthorizedHint.style.display = "flex";
    });

    async function captureSampleFrame() {
        const frameB64 = captureVideoFrame(elements.datasetVideo, 1.0);
        if (!frameB64) {
            alert("Camera feed not ready. Please enable camera first.");
            return null;
        }

        const payload = {
            image: frameB64,
            category: state.selectedCategory,
            student_id: elements.studentIdInput.value.trim(),
            name: elements.studentNameInput.value.trim(),
            department: elements.studentDeptInput.value
        };

        if (state.selectedCategory === "authorized") {
            if (!payload.student_id || !payload.name) {
                alert("Please enter Student Roll / ID Number and Full Name.");
                return null;
            }
        }

        try {
            const res = await fetch("/api/dataset/capture", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.status === "success") {
                updateDatasetCounters(data.dataset_stats);
                return data;
            } else {
                alert("Error saving sample: " + (data.error || "Unknown error"));
                return null;
            }
        } catch (err) {
            console.error("Capture sample error:", err);
            return null;
        }
    }

    // Single Shot Capture
    elements.singleCaptureBtn.addEventListener("click", async () => {
        elements.singleCaptureBtn.disabled = true;
        elements.singleCaptureBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Capturing...`;

        const res = await captureSampleFrame();
        if (res) {
            playBeep("success");
        }

        elements.singleCaptureBtn.disabled = false;
        elements.singleCaptureBtn.innerHTML = `<i class="fa-solid fa-camera"></i> Single Shot`;
    });

    // Burst Capture (20 consecutive shots)
    elements.burstCaptureBtn.addEventListener("click", async () => {
        if (state.burstInProgress) return;

        if (state.selectedCategory === "authorized") {
            if (!elements.studentIdInput.value.trim() || !elements.studentNameInput.value.trim()) {
                alert("Please enter Student Roll Number and Name before starting burst capture.");
                return;
            }
        }

        state.burstInProgress = true;
        elements.burstCaptureBtn.disabled = true;
        elements.singleCaptureBtn.disabled = true;
        elements.burstProgressBox.style.display = "flex";

        const totalShots = 20;
        let successful = 0;

        for (let i = 1; i <= totalShots; i++) {
            elements.burstProgressText.textContent = `Capturing shot ${i} of ${totalShots}... (Move face slightly)`;
            elements.burstProgressBar.style.width = `${(i / totalShots) * 100}%`;

            const res = await captureSampleFrame();
            if (res) successful++;

            // Wait 150ms between shots
            await new Promise(r => setTimeout(r, 150));
        }

        playBeep("success");
        elements.burstProgressText.textContent = `Completed! ${successful} sample frames added to ${state.selectedCategory.toUpperCase()} dataset.`;

        setTimeout(() => {
            elements.burstProgressBox.style.display = "none";
            elements.burstCaptureBtn.disabled = false;
            elements.singleCaptureBtn.disabled = false;
            state.burstInProgress = false;
        }, 2000);

        fetchGlobalStats();
    });

    // Image File Upload for Dataset Creator
    if (elements.uploadDatasetBtn && elements.datasetFileInput) {
        elements.uploadDatasetBtn.addEventListener("click", () => {
            if (state.selectedCategory === "authorized") {
                if (!elements.studentIdInput.value.trim() || !elements.studentNameInput.value.trim()) {
                    alert("Please enter Student Roll Number and Name before uploading authorized images.");
                    return;
                }
            }
            elements.datasetFileInput.click();
        });

        elements.datasetFileInput.addEventListener("change", async (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;

            elements.uploadDatasetBtn.disabled = true;
            if (elements.datasetUploadStatus) {
                elements.datasetUploadStatus.style.display = "block";
                elements.datasetUploadStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Uploading and processing ${files.length} image(s)...`;
            }

            let uploaded = 0;
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (elements.datasetUploadStatus) {
                    elements.datasetUploadStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing image ${i + 1} of ${files.length}...`;
                }

                try {
                    const b64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });

                    const payload = {
                        image: b64,
                        category: state.selectedCategory,
                        student_id: elements.studentIdInput ? elements.studentIdInput.value.trim() : "",
                        name: elements.studentNameInput ? elements.studentNameInput.value.trim() : "",
                        department: elements.studentDeptInput ? elements.studentDeptInput.value : "Computer Science"
                    };

                    const res = await fetch("/api/dataset/capture", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (data.status === "success") {
                        uploaded++;
                        updateDatasetCounters(data.dataset_stats);
                    }
                } catch (err) {
                    console.error("Error uploading file:", file.name, err);
                }
            }

            if (elements.datasetUploadStatus) {
                elements.datasetUploadStatus.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--success);"></i> Successfully uploaded and added <strong>${uploaded}</strong> images to ${state.selectedCategory.toUpperCase()} dataset!`;
                setTimeout(() => {
                    elements.datasetUploadStatus.style.display = "none";
                }, 4000);
            }
            elements.uploadDatasetBtn.disabled = false;
            elements.datasetFileInput.value = "";
            playBeep("success");
            fetchGlobalStats();
        });
    }

    // Upload Test Image for Live Monitoring
    if (elements.uploadTestImageBtn && elements.testImageFileInput) {
        elements.uploadTestImageBtn.addEventListener("click", () => {
            elements.testImageFileInput.click();
        });

        elements.testImageFileInput.addEventListener("change", async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async () => {
                const img = new Image();
                img.onload = async () => {
                    const canvas = elements.overlayCanvas;
                    const ctx = canvas.getContext("2d");
                    canvas.width = elements.webcamVideo.videoWidth || 640;
                    canvas.height = elements.webcamVideo.videoHeight || 480;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    if (state.isTmActive && state.tmModel) {
                        try {
                            const predictions = await state.tmModel.predict(img);
                            let class1Prob = 0;
                            let class2Prob = 0;
                            predictions.forEach((p, idx) => {
                                const name = p.className.toLowerCase();
                                // CRITICAL: Check unauthorized / Class 2 FIRST because "unauthorized" contains the substring "auth"!
                                if (name.includes("unauth") || name.includes("class 2") || name.includes("unknown") || name.includes("intruder")) {
                                    class2Prob = p.probability;
                                } else if (name.includes("class 1") || name.includes("auth") || name.includes("student")) {
                                    class1Prob = p.probability;
                                } else {
                                    if (idx === 0) class1Prob = p.probability;
                                    else class2Prob = p.probability;
                                }
                            });

                            if (elements.tmProbClass1) {
                                elements.tmProbClass1.style.width = `${Math.round(class1Prob * 100)}%`;
                                elements.tmProbClass1Val.textContent = `${Math.round(class1Prob * 100)}%`;
                                elements.tmProbClass2.style.width = `${Math.round(class2Prob * 100)}%`;
                                elements.tmProbClass2Val.textContent = `${Math.round(class2Prob * 100)}%`;
                            }
                            renderTmDetection(class1Prob, class2Prob);

                            if (class1Prob > 0.65) {
                                const sId = elements.studentIdInput ? elements.studentIdInput.value.trim() : "CS101";
                                const sName = elements.studentNameInput ? elements.studentNameInput.value.trim() : "Authorized Student";
                                const res = await fetch("/api/attendance/mark_tm", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ student_id: sId, name: sName, confidence: class1Prob })
                                });
                                const data = await res.json();
                                if (data.is_new) {
                                    addRecentMarkItem(data.record);
                                    playBeep("success");
                                    fetchGlobalStats();
                                }
                            } else if (class2Prob > 0.65) {
                                triggerSecurityAlert("Unauthorized Intruder detected in uploaded image!");
                            }
                        } catch (err) {
                            console.error("TM test image error:", err);
                        }
                    } else {
                        const frameB64 = reader.result;
                        const res = await fetch("/api/attendance/process_frame", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ image: frameB64, threshold: 0.50 })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            renderDetections(data.detections || []);
                            if (data.newly_marked && data.newly_marked.length > 0) {
                                data.newly_marked.forEach(rec => addRecentMarkItem(rec));
                                playBeep("success");
                                fetchGlobalStats();
                            }
                        }
                    }
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
            elements.testImageFileInput.value = "";
        });
    }

    // -------------------------------------------------------------
    // AI Model Training & Gallery
    // -------------------------------------------------------------
    elements.startTrainModelBtn.addEventListener("click", async () => {
        elements.startTrainModelBtn.disabled = true;
        elements.startTrainModelBtn.innerHTML = `<i class="fa-solid fa-gear fa-spin"></i> Training AI Model...`;
        elements.trainNotification.className = "train-notify-box hidden";

        try {
            const res = await fetch("/api/model/train", { method: "POST" });
            const data = await res.json();

            if (data.success) {
                elements.trainNotification.className = "train-notify-box success";
                elements.trainNotification.innerHTML = `
                    <i class="fa-solid fa-circle-check"></i>
                    <strong>${data.message}</strong> Trained on ${data.details.samples} face samples across ${data.details.classes} classes. Accuracy: <strong>${data.details.accuracy}%</strong>.
                `;
                playBeep("success");
                fetchGlobalStats();
            } else {
                elements.trainNotification.className = "train-notify-box error";
                elements.trainNotification.innerHTML = `
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <strong>Training Incomplete:</strong> ${data.message}
                `;
            }
        } catch (err) {
            elements.trainNotification.className = "train-notify-box error";
            elements.trainNotification.textContent = "Training request failed: " + err.message;
        } finally {
            elements.startTrainModelBtn.disabled = false;
            elements.startTrainModelBtn.innerHTML = `<i class="fa-solid fa-play"></i> Train AI Model Now`;
        }
    });

    elements.galleryTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            elements.galleryTabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.galleryTab = btn.getAttribute("data-gallery");
            loadGallerySamples();
        });
    });

    async function loadModelAndGallery() {
        // Load model status
        try {
            const res = await fetch("/api/model/status");
            const info = await res.json();
            elements.modelStatusHeader.textContent = info.status === "trained" ? "Trained & Ready" : "Untrained";
            elements.modelAccuracyHeader.textContent = info.accuracy ? `${info.accuracy}%` : "--%";
            elements.modelSamplesHeader.textContent = info.samples || 0;
            elements.modelLastTrainedHeader.textContent = info.trained_at || "Never";
        } catch (e) {
            console.error("Error loading model info:", e);
        }

        loadGallerySamples();
    }

    async function loadGallerySamples() {
        try {
            elements.galleryContainer.innerHTML = `<div class="empty-state">Loading samples...</div>`;
            const res = await fetch("/api/dataset/gallery");
            const data = await res.json();

            const samples = data[state.galleryTab] || [];
            if (samples.length === 0) {
                elements.galleryContainer.innerHTML = `<div class="empty-state">No samples captured in this class yet.</div>`;
                return;
            }

            let html = "";
            samples.forEach(s => {
                html += `
                    <div class="gallery-thumb">
                        <img src="${s.path}" alt="${s.label}" loading="lazy">
                        <span>${s.label}</span>
                    </div>
                `;
            });
            elements.galleryContainer.innerHTML = html;
        } catch (err) {
            console.error("Gallery loading error:", err);
            elements.galleryContainer.innerHTML = `<div class="empty-state">Failed to load gallery.</div>`;
        }
    }

    // -------------------------------------------------------------
    // Attendance Records & Security Audit Logs
    // -------------------------------------------------------------
    async function loadAttendanceLogs() {
        try {
            const dateVal = elements.filterDateInput.value;
            const url = dateVal ? `/api/attendance/logs?date=${dateVal}` : `/api/attendance/logs`;
            const res = await fetch(url);
            const data = await res.json();
            state.allRecords = data.logs || [];
            renderRecordsTable(state.allRecords);

            // Also load security alerts
            loadSecurityAlerts();
        } catch (err) {
            console.error("Error loading records:", err);
        }
    }

    function renderRecordsTable(records) {
        const query = elements.recordSearchInput.value.toLowerCase().trim();
        const filtered = records.filter(r => {
            if (!query) return true;
            return (r.name && r.name.toLowerCase().includes(query)) ||
                   (r.student_id && r.student_id.toLowerCase().includes(query));
        });

        if (filtered.length === 0) {
            elements.attendanceTableBody.innerHTML = `
                <tr><td colspan="7" class="text-center" style="padding: 2rem; color: var(--text-muted)">
                    No attendance records found.
                </td></tr>
            `;
            return;
        }

        let rowsHtml = "";
        filtered.forEach((rec, idx) => {
            const isPresent = (rec.status !== "Unauthorized");
            const tagHtml = isPresent
                ? `<span class="status-tag present"><i class="fa-solid fa-circle-check"></i> Present</span>`
                : `<span class="status-tag unauthorized"><i class="fa-solid fa-user-xmark"></i> Unauthorized</span>`;

            rowsHtml += `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${rec.student_id}</strong></td>
                    <td>${rec.name}</td>
                    <td>${rec.date}</td>
                    <td><code>${rec.time}</code></td>
                    <td>${Math.round((rec.confidence || 0.95) * 100)}%</td>
                    <td>${tagHtml}</td>
                </tr>
            `;
        });

        elements.attendanceTableBody.innerHTML = rowsHtml;
    }

    elements.recordSearchInput.addEventListener("input", () => {
        renderRecordsTable(state.allRecords);
    });

    elements.filterDateInput.addEventListener("change", loadAttendanceLogs);

    elements.clearDateFilterBtn.addEventListener("click", () => {
        elements.filterDateInput.value = "";
        loadAttendanceLogs();
    });

    async function loadSecurityAlerts() {
        try {
            const res = await fetch("/api/alerts");
            const data = await res.json();
            const alerts = data.alerts || [];

            elements.alertsCountBadge.textContent = `${alerts.length} Recorded`;

            if (alerts.length === 0) {
                elements.securityAlertsList.innerHTML = `<div class="empty-state">No unauthorized intrusions recorded.</div>`;
                return;
            }

            let html = "";
            alerts.forEach(a => {
                html += `
                    <div class="alert-snapshot-card">
                        <img src="${a.image_path || '/static/img/placeholder.jpg'}" alt="Intrusion" class="alert-img">
                        <div class="alert-body">
                            <h5><i class="fa-solid fa-triangle-exclamation"></i> ${a.alert_type}</h5>
                            <p>${a.timestamp}</p>
                        </div>
                    </div>
                `;
            });
            elements.securityAlertsList.innerHTML = html;
        } catch (err) {
            console.error("Alerts load error:", err);
        }
    }

    // -------------------------------------------------------------
    // Quick Student Enroll Modal
    // -------------------------------------------------------------
    elements.openQuickCaptureBtn.addEventListener("click", () => {
        elements.enrollModal.classList.add("show");
    });

    function closeEnrollModal() {
        elements.enrollModal.classList.remove("show");
    }

    elements.closeEnrollModalBtn.addEventListener("click", closeEnrollModal);
    elements.cancelEnrollBtn.addEventListener("click", closeEnrollModal);

    elements.saveEnrollBtn.addEventListener("click", () => {
        const sId = elements.modalStudentId.value.trim();
        const sName = elements.modalStudentName.value.trim();
        const sDept = elements.modalStudentDept.value.trim();

        if (!sId || !sName) {
            alert("Please fill in both Student ID and Full Name.");
            return;
        }

        elements.studentIdInput.value = sId;
        elements.studentNameInput.value = sName;
        elements.studentDeptInput.value = sDept;

        closeEnrollModal();
        switchTab("tab-dataset");
        elements.btnClass1.click();
    });

    // -------------------------------------------------------------
    // Global Statistics & Counters
    // -------------------------------------------------------------
    async function fetchGlobalStats() {
        try {
            const res = await fetch("/api/stats");
            const data = await res.json();

            // Dashboard stats
            const d = data.dashboard;
            if (elements.statTotalStudents) elements.statTotalStudents.textContent = d.total_students;
            if (elements.statPresentToday) elements.statPresentToday.textContent = d.present_today;
            if (elements.statAbsentToday) elements.statAbsentToday.textContent = d.absent_today;
            if (elements.statDatasetTotal) elements.statDatasetTotal.textContent = (data.dataset ? data.dataset.total_images : 0);
            if (elements.headerPresentCount) elements.headerPresentCount.textContent = d.present_today;
            if (elements.headerTotalCount) elements.headerTotalCount.textContent = d.total_students;

            const rate = d.total_students > 0 ? Math.round((d.present_today / d.total_students) * 100) : 0;
            if (elements.statPresentRate) elements.statPresentRate.textContent = `${rate}% Attendance Rate`;

            // Dataset counters
            updateDatasetCounters(data.dataset);

            // Model info
            const m = data.model;
            if (m && m.status === "trained") {
                elements.aiStatusText.textContent = "Active / Trained";
                elements.aiStatusBadge.querySelector(".status-circle").className = "status-circle green";
                elements.aiAccuracyVal.textContent = `${m.accuracy}%`;
                elements.aiClassesVal.textContent = m.classes || "--";
            } else {
                elements.aiStatusText.textContent = "Model Untrained";
                elements.aiStatusBadge.querySelector(".status-circle").className = "status-circle amber";
                elements.aiAccuracyVal.textContent = "--%";
                elements.aiClassesVal.textContent = "--";
            }
        } catch (err) {
            console.error("Stats refresh error:", err);
        }
    }

    function updateDatasetCounters(ds) {
        if (!ds) return;
        elements.datasetClass1Count.textContent = ds.authorized_count || 0;
        elements.datasetClass2Count.textContent = ds.unauthorized_count || 0;
        elements.datasetTotalCount.textContent = ds.total_images || 0;
        elements.sidebarSampleCount.textContent = ds.total_images || 0;
    }

    function renderTmDetection(class1Prob, class2Prob) {
        const video = elements.webcamVideo;
        const canvas = elements.overlayCanvas;
        if (!video || video.videoWidth === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const isAuth = class1Prob > class2Prob;
        const conf = isAuth ? class1Prob : class2Prob;
        const color = isAuth ? "#10B981" : "#EF4444";
        const label = isAuth ? `Class 1: Authorized Student (${Math.round(conf * 100)}%)` : `Class 2: UNAUTHORIZED / INTRUDER (${Math.round(conf * 100)}%)`;

        const boxW = Math.round(canvas.width * 0.55);
        const boxH = Math.round(canvas.height * 0.70);
        const bx = Math.round((canvas.width - boxW) / 2);
        const by = Math.round((canvas.height - boxH) / 2);

        // Draw bounding box
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.strokeRect(bx, by, boxW, boxH);
        ctx.shadowBlur = 0;

        // Label background & text
        ctx.font = "bold 16px 'Plus Jakarta Sans', sans-serif";
        const textWidth = ctx.measureText(label).width;
        ctx.fillStyle = color;
        ctx.fillRect(bx, by - 30, textWidth + 16, 30);

        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(label, bx + 8, by - 9);

        // Update list
        elements.liveDetectCount.textContent = `1 Classified (TM)`;
        elements.detectedFacesList.innerHTML = `
            <div class="detection-pill ${isAuth ? 'auth' : 'unauth'}">
                <div class="det-info">
                    <h4>${isAuth ? 'Authorized Student (Class 1)' : 'Unauthorized Person (Class 2)'}</h4>
                    <p>Google Teachable Machine Neural Classifier</p>
                </div>
                <div class="det-confidence" style="color: ${color}">
                    ${Math.round(conf * 100)}%
                </div>
            </div>
        `;
    }

    // Teachable Machine Button Listeners
    if (elements.loadTmModelBtn) {
        elements.loadTmModelBtn.addEventListener("click", async () => {
            let url = elements.tmModelUrlInput.value.trim();
            if (!url) {
                alert("Please enter your Teachable Machine shareable link.\nExample: https://teachablemachine.withgoogle.com/models/v6n9jJ3k/");
                return;
            }
            if (!url.endsWith("/")) url += "/";

            elements.loadTmModelBtn.disabled = true;
            elements.loadTmModelBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Connecting...`;

            try {
                if (typeof tmImage === "undefined") {
                    throw new Error("Teachable Machine library is loading. Please check internet connection.");
                }
                const modelURL = url + "model.json";
                const metadataURL = url + "metadata.json";
                state.tmModel = await tmImage.load(modelURL, metadataURL);
                state.isTmActive = true;

                elements.tmStatusBadge.textContent = "Teachable Machine Connected";
                elements.tmStatusBadge.className = "badge badge-success";
                elements.tmLiveBars.style.display = "flex";
                alert("Teachable Machine model connected successfully!\nLive attendance recognition is now running via your Google TM neural network.");
                switchTab("tab-monitor");
            } catch (err) {
                alert("Failed to load Teachable Machine model: " + err.message + "\nPlease verify the model was exported via 'Upload my model (shareable link)'.");
            } finally {
                elements.loadTmModelBtn.disabled = false;
                elements.loadTmModelBtn.innerHTML = `<i class="fa-solid fa-plug"></i> Connect Model`;
            }
        });
    }

    if (elements.loadDemoTmModelBtn) {
        elements.loadDemoTmModelBtn.addEventListener("click", () => {
            state.isTmActive = true;
            elements.tmStatusBadge.textContent = "Sample TM Simulator Active";
            elements.tmStatusBadge.className = "badge badge-success";
            elements.tmLiveBars.style.display = "flex";
            alert("Sample Teachable Machine mode activated!\nThe system is now evaluating frames and displaying Class 1 vs Class 2 probability meters.");
            switchTab("tab-monitor");
        });
    }

    elements.refreshStatsBtn.addEventListener("click", fetchGlobalStats);

    // Initial startup
    fetchGlobalStats();
    startCamera();
});
