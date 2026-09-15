import { useState, useRef, useEffect } from "react";
import * as faceapi from 'face-api.js';
import DashboardLayout from "@/components/DashboardLayout";
import AnimatedPage, { staggerContainer, fadeInUp } from "@/components/AnimatedPage";
import { motion } from "framer-motion";
import { Camera, CheckCircle2, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const FaceRegistrationPage = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [modelLoaded, setModelLoaded] = useState(false);
    const { api, user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    useEffect(() => {
        const loadModels = async () => {
            try {
                const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);
                setModelLoaded(true);
                startVideo();
            } catch (err) {
                console.error("Failed to load models:", err);
                toast({
                    title: "Model Load Error",
                    description: "Failed to load AI models. Please check your internet connection.",
                    variant: "destructive"
                });
            }
        };
        loadModels();

        return () => {
            // Cleanup video stream on unmount
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } } })
            .then(stream => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            })
            .catch(err => {
                console.error("Video error:", err);
                toast({
                    title: "Camera Error",
                    description: "Cannot access the camera. Please allow camera permissions.",
                    variant: "destructive"
                });
            });
    };

    const handleVideoPlay = () => {
        const interval = setInterval(async () => {
            if (canvasRef.current && videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
                // Use videoWidth/Height for true inner resolution and let canvas stretch via CSS
                const displaySize = {
                    width: videoRef.current.videoWidth,
                    height: videoRef.current.videoHeight
                };

                // Only proceed if video is ready
                if (displaySize.width === 0) return;

                faceapi.matchDimensions(canvasRef.current, displaySize);

                try {
                    // Use SsdMobilenetv1 for higher accuracy during registration (creates better face descriptors)
                    const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.8 }))
                        .withFaceLandmarks();

                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx) {
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }

                    if (detections) {
                        const resizedDetections = faceapi.resizeResults(detections, displaySize);
                        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
                        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);
                    }
                } catch (e) {
                    // ignore
                }
            }
        }, 100);
        return () => clearInterval(interval);
    };

    const capture = async () => {
        if (!videoRef.current) return;
        setIsLoading(true);

        toast({
            title: "Scanning Face...",
            description: "Please hold still.",
        });

        try {
            // Use SsdMobilenetv1 for higher accuracy during registration (creates better face descriptors)
            const detections = await faceapi.detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.8 }))
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detections) {
                const videoWidth = videoRef.current.videoWidth || 640;
                const faceWidth = detections.detection.box.width;

                if (faceWidth < videoWidth * 0.25) {
                    toast({
                        title: "Move Closer",
                        description: "Your face is too far away. Please move closer to the camera for a clear scan.",
                        variant: "destructive"
                    });
                    setIsLoading(false);
                    return;
                }

                const descriptor = Array.from(detections.descriptor);
                
                // Capture the current video frame to send to backend for DeepFace extraction
                const snapCanvas = document.createElement('canvas');
                snapCanvas.width = videoWidth;
                snapCanvas.height = videoRef.current.videoHeight || 480;
                const ctx = snapCanvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(videoRef.current, 0, 0, snapCanvas.width, snapCanvas.height);
                }
                const imageBase64 = snapCanvas.toDataURL('image/jpeg', 0.9);

                await api.post('/classes/face/register', { descriptor, image: imageBase64 });

                toast({
                    title: "Success",
                    description: "Face Registered Successfully!",
                });

                // Stop stream
                if (videoRef.current.srcObject) {
                    const stream = videoRef.current.srcObject as MediaStream;
                    stream.getTracks().forEach(track => track.stop());
                }

                navigate('/student');
            } else {
                toast({
                    title: "Detection Failed",
                    description: "No face detected. Please try again with better lighting.",
                    variant: "destructive"
                });
            }
        } catch (err) {
            console.error(err);
            toast({
                title: "Registration Error",
                description: "Failed to save face data to the server.",
                variant: "destructive"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DashboardLayout role="student">
            <AnimatedPage>
                <motion.div variants={staggerContainer} initial="initial" animate="animate" className="max-w-3xl mx-auto space-y-6">
                    <motion.div variants={fadeInUp} className="text-center">
                        <div className="mx-auto h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                            <ShieldCheck className="h-8 w-8 text-primary" />
                        </div>
                        <h1 className="font-display text-2xl font-bold">Setup Face ID</h1>
                        <p className="text-muted-foreground text-sm mt-2 max-w-md mx-auto">
                            Register your face to quickly mark attendance in your classes. Ensure you are in a well-lit area and looking directly at the camera.
                        </p>
                    </motion.div>

                    <motion.div variants={fadeInUp} className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
                        <div className="relative min-h-[450px] bg-secondary/30 flex items-center justify-center">
                            {!modelLoaded ? (
                                <div className="text-center space-y-3">
                                    <div className="mx-auto h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                                    <p className="text-sm font-semibold text-primary">Loading AI Models...</p>
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        muted
                                        className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
                                        onPlay={handleVideoPlay}
                                    />
                                    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none scale-x-[-1]" />
                                </>
                            )}
                        </div>

                        <div className="p-6 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                {user?.faceDataRegistered ? (
                                    <>
                                        <CheckCircle2 className="h-5 w-5 text-success" />
                                        <div className="text-sm">
                                            <p className="font-semibold text-success">Already Registered</p>
                                            <p className="text-xs text-muted-foreground">You can recapture to update it.</p>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <AlertTriangle className="h-5 w-5 text-warning" />
                                        <div className="text-sm">
                                            <p className="font-semibold text-warning">Not Registered</p>
                                            <p className="text-xs text-muted-foreground">Action required for attendance</p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button variant="outline" onClick={() => navigate('/student')} className="flex-1 sm:flex-none rounded-xl">
                                    Cancel
                                </Button>
                                <Button
                                    onClick={capture}
                                    disabled={!modelLoaded || isLoading}
                                    className="flex-1 sm:flex-none rounded-xl gap-2 min-w-[140px]"
                                >
                                    <Camera className="h-4 w-4" />
                                    {isLoading ? 'Scanning...' : 'Capture & Save'}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </AnimatedPage>
        </DashboardLayout >
    );
};

export default FaceRegistrationPage;
