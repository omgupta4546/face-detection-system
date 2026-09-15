import { useState, useRef, useEffect } from "react";
import * as faceapi from 'face-api.js';
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import AnimatedPage, { staggerContainer, fadeInUp } from "@/components/AnimatedPage";
import { motion } from "framer-motion";
import { Camera, CheckCircle2, XCircle, RefreshCw, Scan, Search, Users, AlertTriangle, Save, Upload, FlipHorizontal, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const TakeAttendancePage = () => {
  const { classCode: urlClassCode } = useParams();
  const [classCode, setClassCode] = useState(urlClassCode || "");
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [useAI, setUseAI] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const [detectedCount, setDetectedCount] = useState<number>(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef<boolean>(false);
  const matchCountsRef = useRef<Record<string, number>>({});
  const [matcher, setMatcher] = useState<faceapi.FaceMatcher | null>(null);
  const [modelLoaded, setModelLoaded] = useState(false);

  const { api } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await api.get('/classes/my');
        setClasses(res.data);
        if (!urlClassCode && res.data.length > 0) {
          setClassCode(res.data[0].code);
        }
      } catch (err) {
        console.error("Failed to fetch classes", err);
      }
    };
    fetchClasses();
  }, [api, urlClassCode]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!classCode) return;
      try {
        const res = await api.get(`/classes/${classCode}/students`);
        setStudents(res.data);

        const labeledDescriptors = res.data
          .filter((s: any) => s.isFaceRegistered && s.faceDescriptor && s.faceDescriptor.length > 0)
          .map((s: any) => new faceapi.LabeledFaceDescriptors(s._id.toString(), [new Float32Array(s.faceDescriptor)]));

        if (labeledDescriptors.length > 0) {
          // Relaxed threshold to 0.55 to allow matches for smaller/blurry faces in group photos
          setMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.55));
        } else {
          setMatcher(null);
        }
      } catch (err) {
        console.error("Error fetching students:", err);
      }
    };
    fetchStudents();
  }, [classCode, api]);

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
      } catch (err) {
        console.error("Failed to load models:", err);
        toast({ title: "Error", description: "Failed to load AI models.", variant: "destructive" });
      }
    };
    loadModels();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let cancelled = false;

    const startDetectionLoop = () => {
      if (cancelled) return;
      interval = setInterval(async () => {
        if (isProcessingRef.current) return; // Prevent queueing up heavy processes

        if (videoRef.current && canvasRef.current && !videoRef.current.paused && videoRef.current.readyState >= 2) {
          try {
            isProcessingRef.current = true;
            // Increased scoreThreshold from 0.25 to 0.5 to avoid detecting non-faces
            const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 608, scoreThreshold: 0.5 }))
              .withFaceLandmarks()
              .withFaceDescriptors();

            setDetectedCount(detections.length);

            const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
            if (displaySize.width === 0) {
              isProcessingRef.current = false;
              return; // Video not ready
            }
            faceapi.matchDimensions(canvasRef.current, displaySize);

            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

            const results = resizedDetections.map(d => matcher.findBestMatch(d.descriptor));

            results.forEach((result, i) => {
              const box = resizedDetections[i].detection.box;
              const drawBox = new faceapi.draw.DrawBox(box, { label: result.toString() });
              if (canvasRef.current) drawBox.draw(canvasRef.current);

              if (result.label !== 'unknown') {
                matchCountsRef.current[result.label] = (matchCountsRef.current[result.label] || 0) + 1;

                if (matchCountsRef.current[result.label] >= 3) {
                  setPresentIds(prev => {
                    const newSet = new Set(prev);
                    newSet.add(result.label);
                    return newSet;
                  });
                }
              }
            });
          } catch (e) {
            console.error(e);
          } finally {
            isProcessingRef.current = false;
          }
        }
      }, 500); // 2 FPS again, thanks to TinyFaceDetector speed!
    };

    if (isScanning && useAI && matcher && modelLoaded) {
      matchCountsRef.current = {}; // Reset counts on start

      // Always stop any existing stream first, then request a fresh one
      if (videoRef.current?.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode } })
        .then(stream => {
          if (cancelled) {
            stream.getTracks().forEach(track => track.stop());
            return;
          }
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // Wait for the video to actually start playing before running detection
            const onPlaying = () => {
              videoRef.current?.removeEventListener('playing', onPlaying);
              startDetectionLoop();
            };
            // If the video is already playing (unlikely but possible), start immediately
            if (videoRef.current.readyState >= 2 && !videoRef.current.paused) {
              startDetectionLoop();
            } else {
              videoRef.current.addEventListener('playing', onPlaying);
            }
          }
        })
        .catch(err => {
          console.error("Camera error:", err);
          toast({ title: "Camera Error", description: "Could not access the camera. Please allow camera permissions.", variant: "destructive" });
        });
    } else {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    }
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [isScanning, useAI, matcher, modelLoaded, facingMode]);

  const switchCamera = () => {
    // Stop current stream tracks
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    // Toggle facing mode
    const newMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newMode);
    // Request new stream with new facing mode
    navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 }, facingMode: newMode } })
      .then(stream => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(err => {
        console.error("Camera switch error:", err);
        toast({ title: "Camera Error", description: "Could not switch camera.", variant: "destructive" });
      });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (isScanning) setIsScanning(false); // Stop video if running

    const newImages: string[] = [];
    let loaded = 0;

    toast({ title: "Uploading Images", description: `Loading ${files.length} photos...` });

    for (let i = 0; i < files.length; i++) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        newImages.push(e.target?.result as string);
        loaded++;
        if (loaded === files.length) {
          setUploadedImages(newImages);
          setCurrentImageIndex(0); // Start processing from the first image
        }
      };
      reader.readAsDataURL(files[i]);
    }
  };

  const processUploadedImage = async () => {
    if (!classCode) return;
    const imgData = uploadedImages[currentImageIndex];
    if (!imgData) return;

    // Clear canvas if it exists since we won't draw boxes for backend AI
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    try {
      toast({ title: `Scanning Photo (${currentImageIndex + 1}/${uploadedImages.length})...`, description: "DeepFace AI is processing the image." });

      const res = await api.post('/classes/recognize-photo', {
        classCode,
        image: imgData
      });

      const { matchedStudentIds, detectedFaces } = res.data;

      if (matchedStudentIds && matchedStudentIds.length > 0) {
        setPresentIds(prev => {
          const newSet = new Set(prev);
          matchedStudentIds.forEach((id: string) => newSet.add(id));
          return newSet;
        });
      }

      toast({ title: `Scan Complete (${currentImageIndex + 1}/${uploadedImages.length})`, description: `Found ${detectedFaces} faces, matched ${matchedStudentIds ? matchedStudentIds.length : 0} students.` });

      // Auto-advance to the next photo after a short delay
      if (currentImageIndex < uploadedImages.length - 1) {
        setTimeout(() => {
          setCurrentImageIndex(prev => prev + 1);
        }, 1500); // 1.5 seconds delay
      } else if (uploadedImages.length > 1) {
        setTimeout(() => {
          toast({ title: "All Photos Scanned", description: "All uploaded photos have been processed successfully." });
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Scan Error", description: "Failed to process image with DeepFace API.", variant: "destructive" });
    }
  };

  const toggleStudent = (id: string) => {
    setPresentIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const submitAttendance = async () => {
    if (!classCode) return;
    try {
      await api.post('/classes/mark', {
        classCode: classCode,
        studentsPresent: Array.from(presentIds)
      });
      toast({ title: "Success", description: "Attendance Saved!" });
      navigate(`/professor/classroom/${classCode}`);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to save attendance", variant: "destructive" });
    }
  };

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.universityRollNo?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <DashboardLayout role="professor">
      <AnimatedPage>
        <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-6">
          <motion.div variants={fadeInUp}>
            <h1 className="font-display text-2xl font-bold">Take Attendance</h1>
            <p className="text-muted-foreground text-sm mt-1">Use AI face recognition or mark manually.</p>
          </motion.div>

          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div variants={fadeInUp} className="rounded-xl border border-border bg-card p-6 shadow-soft space-y-4">
              <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session Setup</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Class</Label>
                  <Select value={classCode} onValueChange={setClassCode}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Select Class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map(c => (
                        <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label className="text-sm font-medium">Use AI Detection</Label>
                  <Switch checked={useAI} onCheckedChange={setUseAI} />
                </div>

                {!matcher && useAI && students.length > 0 && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-xl text-xs text-warning flex gap-2 items-start mt-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <p>No students have registered their face data yet for this class.</p>
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div variants={fadeInUp} className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden shadow-soft">
              <div className="flex aspect-video items-center justify-center bg-secondary/30 relative">
                {useAI ? (
                  <>
                    <video ref={videoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${!isScanning ? 'hidden' : ''}`} />
                    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />

                    {!isScanning && uploadedImages.length === 0 ? (
                      <div className="text-center space-y-4 absolute inset-0 flex flex-col items-center justify-center bg-card/80 backdrop-blur-sm">
                        <div className="mx-auto h-16 w-16 rounded-2xl bg-secondary flex items-center justify-center">
                          <Camera className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm text-muted-foreground">Start camera or upload class photos</p>
                        <div className="flex flex-col gap-3">
                          <Button
                            onClick={() => { setUploadedImages([]); setIsScanning(true); }}
                            disabled={!modelLoaded || !classCode}
                            className="gradient-primary border-0 text-primary-foreground gap-2 rounded-xl shadow-md"
                          >
                            <Scan className="h-4 w-4" /> Start Camera
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={!modelLoaded || !classCode}
                            className="gap-2 rounded-xl border border-border"
                          >
                            <Upload className="h-4 w-4" /> Upload Photo(s)
                          </Button>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                          />
                        </div>
                      </div>
                    ) : isScanning ? (
                      <>
                        {/* Live face count badge */}
                        <div className="absolute top-4 left-4">
                          <Badge className="bg-background/80 backdrop-blur-md text-foreground border-border shadow-lg text-sm px-3 py-1.5 gap-2">
                            <Users className="h-3.5 w-3.5" />
                            {detectedCount} face{detectedCount !== 1 ? 's' : ''} detected
                          </Badge>
                        </div>
                        {/* Bottom controls: Stop + Switch Camera */}
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                          <Button variant="secondary" onClick={switchCamera} className="rounded-xl shadow-lg gap-2 border border-border">
                            <FlipHorizontal className="h-4 w-4" /> Switch Camera
                          </Button>
                          <Button variant="destructive" onClick={() => { setIsScanning(false); setDetectedCount(0); }} className="rounded-xl shadow-lg">
                            Stop Camera
                          </Button>
                        </div>
                      </>
                    ) : uploadedImages.length > 0 ? (
                      <div className="absolute inset-0 w-full h-full">
                        <img
                          ref={imageRef}
                          src={uploadedImages[currentImageIndex]}
                          alt={`Uploaded Class ${currentImageIndex + 1}`}
                          className="w-full h-full object-contain"
                          onLoad={processUploadedImage}
                        />
                        <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none object-contain" />
                        <div className="absolute top-4 right-4 flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => { setUploadedImages([]); setCurrentImageIndex(0); }} className="rounded-xl shadow-md">
                            Clear Photo(s)
                          </Button>
                        </div>
                        {uploadedImages.length > 1 && (
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 items-center">
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="rounded-full h-8 w-8 p-0 border border-border shadow-md"
                              onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                              disabled={currentImageIndex === 0}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Badge className="bg-background/80 backdrop-blur-md text-foreground border-border shadow-lg text-sm px-4 py-1.5">
                              Photo {currentImageIndex + 1} of {uploadedImages.length}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="rounded-full h-8 w-8 p-0 border border-border shadow-md"
                              onClick={() => setCurrentImageIndex(prev => Math.min(uploadedImages.length - 1, prev + 1))}
                              disabled={currentImageIndex === uploadedImages.length - 1}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="text-center space-y-4 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto opacity-20" />
                    <p>AI Detection is disabled.</p>
                    <p className="text-xs">Use the manual list below to mark attendance.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>

          <motion.div variants={fadeInUp} className="rounded-xl border border-border bg-card p-6 shadow-soft">
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-display text-base font-semibold">Teacher Override & Final List</h3>
                  <Badge className="bg-success/10 text-success border-success/20" variant="outline">{presentIds.size} Present</Badge>
                  <Badge className="bg-destructive/10 text-destructive border-destructive/20" variant="outline">{students.length - presentIds.size} Absent</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Click any student to manually override AI and toggle their attendance status.</p>
              </div>
              <div className="flex gap-2 items-start mt-2 sm:mt-0">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search students..."
                    className="pl-9 rounded-xl h-9 w-full sm:w-64"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => setPresentIds(new Set())} className="gap-2 rounded-xl h-9">
                  <RefreshCw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-h-[500px] overflow-y-auto pr-2 pb-2">
              {filteredStudents.length === 0 && (
                <div className="col-span-full py-8 text-center text-muted-foreground">
                  {students.length === 0 ? "No students in this class." : "No students found."}
                </div>
              )}
              {filteredStudents.map((student) => {
                const isPresent = presentIds.has(student._id.toString());
                return (
                  <motion.button
                    key={student._id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleStudent(student._id.toString())}
                    className={`flex items-center gap-3 rounded-xl p-3.5 text-left transition-all border ${isPresent
                      ? "border-success/30 bg-success/5 hover:bg-success/10"
                      : "border-border bg-secondary/30 hover:bg-secondary/50"
                      }`}
                  >
                    {isPresent ? (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{student.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{student.universityRollNo || "N/A"}</p>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => navigate('/professor')} className="rounded-xl">Cancel</Button>
              <Button onClick={submitAttendance} disabled={!classCode || students.length === 0} className="gradient-primary border-0 text-primary-foreground rounded-xl shadow-md gap-2">
                <Save className="h-4 w-4" /> Save Attendance
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatedPage>
    </DashboardLayout>
  );
};

export default TakeAttendancePage;
