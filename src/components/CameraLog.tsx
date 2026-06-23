import React, { useState, useRef, useEffect } from 'react';
import { analyzeFoodImage } from '../gemini';
import { getSetting } from '../db';
import { Camera, Image as ImageIcon, Sparkles, Save, X, AlertTriangle } from 'lucide-react';

interface CameraLogProps {
  onMealSaved: (mealData: {
    name: string;
    photo?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    servingSize: string;
    servingQuantity: number;
  }) => void;
  onNavigate: (tab: any) => void;
}


export default function CameraLog({ onMealSaved, onNavigate }: CameraLogProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Webcam-specific States
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Form fields
  const [mealName, setMealName] = useState('');
  const [servingSize, setServingSize] = useState('1 portion');
  const [servingQuantity, setServingQuantity] = useState(1);
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fat, setFat] = useState(0);
  const [fiber, setFiber] = useState(0);
  const [sugar, setSugar] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if API key exists on load
  useEffect(() => {
    async function checkKey() {
      const key = await getSetting('geminiApiKey', '');
      setHasApiKey(!!key);
    }
    checkKey();
  }, []);

  // Clean up media tracks when streaming state terminates
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  // Bind video element to media stream source
  useEffect(() => {
    if (isWebcamActive && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [isWebcamActive, stream]);

  const handleStartWebcam = async () => {
    setErrorMsg('');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1024 }, height: { ideal: 1024 } }
      });
      setStream(mediaStream);
      setIsWebcamActive(true);
    } catch (e: any) {
      console.error('Error starting webcam:', e);
      setErrorMsg('Failed to access camera. Please check camera permissions or try file upload.');
    }
  };

  const handleStopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsWebcamActive(false);
  };

  const handleCaptureWebcam = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUri = canvas.toDataURL('image/jpeg', 0.8);
      setPhoto(dataUri);
      setErrorMsg('');
      handleStopWebcam();
      analyzePhoto(dataUri);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        // Create a canvas to downscale the image for mobile network efficiency
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1024;
        const MAX_HEIGHT = 1024;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress to JPEG with 80% quality (great ratio of visual details to file size)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setPhoto(compressedBase64);
          setErrorMsg('');
          analyzePhoto(compressedBase64);
        } else {
          // Fallback to original base64 if canvas is unsupported
          const originalBase64 = reader.result as string;
          setPhoto(originalBase64);
          setErrorMsg('');
          analyzePhoto(originalBase64);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const analyzePhoto = async (base64Img: string) => {
    const key = await getSetting('geminiApiKey', '');
    if (!key) {
      setErrorMsg('No Gemini API Key found. Please add a key in Settings to use image analysis.');
      return;
    }
    const modelName = await getSetting('geminiModel', 'gemini-1.5-flash');

    setLoading(true);
    setErrorMsg('');

    try {
      const result = await analyzeFoodImage(base64Img, key, modelName);
      
      setMealName(result.name);
      setServingSize(result.servingSize);
      setServingQuantity(result.servingQuantity);
      setCalories(result.calories);
      setProtein(result.protein);
      setCarbs(result.carbs);
      setFat(result.fat);
      setFiber(result.fiber);
      setSugar(result.sugar);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'AI recognition failed. You can still input values manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualInput = () => {
    setPhoto(null);
    setMealName('');
    setServingSize('1 portion');
    setServingQuantity(1);
    setCalories(0);
    setProtein(0);
    setCarbs(0);
    setFat(0);
    setFiber(0);
    setSugar(0);
    // Set dummy photo or leave null
    setPhoto('manual');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) {
      alert('Please enter a meal name.');
      return;
    }

    onMealSaved({
      name: mealName.trim(),
      photo: photo && photo !== 'manual' ? photo : undefined,
      calories: Math.max(0, Number(calories) || 0),
      protein: Math.max(0, Number(protein) || 0),
      carbs: Math.max(0, Number(carbs) || 0),
      fat: Math.max(0, Number(fat) || 0),
      fiber: Math.max(0, Number(fiber) || 0),
      sugar: Math.max(0, Number(sugar) || 0),
      servingSize: servingSize.trim(),
      servingQuantity: Math.max(0.1, Number(servingQuantity) || 1)
    });

    // Reset screen
    setPhoto(null);
  };

  const handleCancel = () => {
    setPhoto(null);
    setLoading(false);
    setErrorMsg('');
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="animate-slide-up" style={styles.container}>
      <h2 style={styles.title}>Log Food</h2>

      {/* API Key Warning */}
      {!hasApiKey && (
        <div style={styles.warningAlert}>
          <AlertTriangle size={18} style={{ color: '#ffd600', flexShrink: 0 }} />
          <div style={styles.warningTextContainer}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#f4f4f5' }}>API Key Missing</span>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Add a Gemini API key in Settings to unlock automatic food photo recognition.
            </p>
            <button onClick={() => onNavigate('settings')} style={styles.warningLinkBtn}>
              Go to Settings
            </button>
          </div>
        </div>
      )}

      {/* Main Upload / Camera Triggers */}
      {!photo && !isWebcamActive && (
        <div style={styles.uploadZoneContainer}>
          <div style={styles.dropZone} onClick={triggerUpload}>
            <div style={styles.iconRing} className="animate-pulse-glow">
              <Camera size={28} style={{ color: 'var(--text-primary)' }} />
            </div>
            <span style={styles.uploadTitle}>Capture Meal</span>
            <span style={styles.uploadSub}>Use mobile system camera</span>
          </div>

          <div style={styles.uploadAltRow3}>
            <button type="button" style={styles.altBtn} onClick={handleStartWebcam}>
              <Camera size={14} style={{ marginRight: 4 }} /> Live WebCam
            </button>
            <button type="button" style={styles.altBtn} onClick={triggerUpload}>
              <ImageIcon size={14} style={{ marginRight: 4 }} /> Gallery
            </button>
            <button type="button" style={styles.altBtn} onClick={handleManualInput}>
              Manual Log
            </button>
          </div>
          
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden-file-input"
          />
        </div>
      )}

      {/* WebRTC Video Streaming View */}
      {isWebcamActive && (
        <div style={styles.scanContainer} className="animate-fade-in">
          {errorMsg && (
            <div style={styles.errorAlert}>
              <AlertTriangle size={16} style={{ color: '#ff5e62', flexShrink: 0 }} />
              <span style={{ fontSize: '12px' }}>{errorMsg}</span>
            </div>
          )}
          
          <div style={styles.scanCard}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          
          <div style={styles.loaderStatus}>
            <span style={styles.loaderText}>Frame Your Food</span>
            <p style={styles.loaderSub}>Align your meal, then tap the shutter button below</p>
          </div>

          <div style={styles.webcamActionRow}>
            <button type="button" onClick={handleStopWebcam} style={styles.webcamCancelBtn}>
              Cancel
            </button>
            <button type="button" onClick={handleCaptureWebcam} style={styles.shutterBtn}>
              <div style={styles.shutterInner} />
            </button>
            <div style={{ width: '80px' }} /> {/* Spacing spacer offset */}
          </div>
        </div>
      )}

      {/* Scan Screen / Loader */}
      {photo && loading && (
        <div style={styles.scanContainer} className="animate-fade-in">
          <div style={styles.scanCard}>
            <img src={photo} alt="Food analysis" style={styles.scanImage} />
            <div style={styles.scanLine} />
          </div>
          
          <div style={styles.loaderStatus}>
            <Sparkles size={20} className="animate-pulse-glow" style={{ color: '#00f2fe' }} />
            <span style={styles.loaderText} className="animate-pulse-glow">
              Gemini Vision recognition in progress...
            </span>
            <p style={styles.loaderSub}>Estimating calories, proteins, carbohydrates, and fats...</p>
          </div>

          <button onClick={handleCancel} style={styles.cancelBtn}>
            <X size={16} style={{ marginRight: 6 }} /> Cancel
          </button>
        </div>
      )}

      {/* Review Screen */}
      {photo && !loading && (
        <form onSubmit={handleSubmit} style={styles.form} className="animate-fade-in">
          {photo !== 'manual' && (
            <div style={styles.previewImageContainer}>
              <img src={photo} alt="Food preview" style={styles.previewImage} />
              <button type="button" onClick={handleCancel} style={styles.changePhotoBtn}>
                Change Photo
              </button>
            </div>
          )}

          {errorMsg && (
            <div style={styles.errorAlert}>
              <AlertTriangle size={16} style={{ color: '#ff5e62', flexShrink: 0 }} />
              <span style={{ fontSize: '12px' }}>{errorMsg}</span>
            </div>
          )}

          <div style={styles.formSection}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Meal Name</label>
              <input
                type="text"
                placeholder="e.g. Avocado Toast with Egg"
                value={mealName}
                onChange={(e) => setMealName(e.target.value)}
                style={styles.textInput}
                required
              />
            </div>

            <div style={styles.grid2}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Serving Unit</label>
                <input
                  type="text"
                  placeholder="e.g. bowl, plate, 250g"
                  value={servingSize}
                  onChange={(e) => setServingSize(e.target.value)}
                  style={styles.textInput}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Quantity</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  value={servingQuantity}
                  onChange={(e) => setServingQuantity(Number(e.target.value))}
                  style={styles.textInput}
                  required
                />
              </div>
            </div>
          </div>

          {/* Macro grid */}
          <div style={styles.formSection}>
            <h3 style={styles.sectionHeading}>Nutrition Profile</h3>
            
            <div style={styles.grid2}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Calories (kcal)</label>
                <input
                  type="number"
                  value={calories}
                  onChange={(e) => setCalories(Number(e.target.value))}
                  style={styles.textInput}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={protein}
                  onChange={(e) => setProtein(Number(e.target.value))}
                  style={styles.textInput}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Carbohydrates (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={carbs}
                  onChange={(e) => setCarbs(Number(e.target.value))}
                  style={styles.textInput}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={fat}
                  onChange={(e) => setFat(Number(e.target.value))}
                  style={styles.textInput}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Fiber (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={fiber}
                  onChange={(e) => setFiber(Number(e.target.value))}
                  style={styles.textInput}
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>Sugar (g)</label>
                <input
                  type="number"
                  step="0.1"
                  value={sugar}
                  onChange={(e) => setSugar(Number(e.target.value))}
                  style={styles.textInput}
                />
              </div>
            </div>
          </div>

          <div style={styles.actionRow}>
            <button type="button" onClick={handleCancel} style={styles.secondaryBtn}>
              Cancel
            </button>
            <button type="submit" style={styles.primaryBtn}>
              <Save size={16} style={{ marginRight: 6 }} /> Save Log
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '24px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    paddingBottom: '100px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
  },
  warningAlert: {
    display: 'flex',
    gap: '12px',
    backgroundColor: 'rgba(255, 214, 0, 0.06)',
    border: '1px solid rgba(255, 214, 0, 0.2)',
    padding: '14px',
    borderRadius: '16px',
    alignItems: 'flex-start' as const,
  },
  warningTextContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  warningLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#ffd600',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    marginTop: '8px',
    textAlign: 'left' as const,
  },
  uploadZoneContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginTop: '8px',
  },
  dropZone: {
    backgroundColor: 'var(--bg-card)',
    border: '2px dashed var(--border-color)',
    borderRadius: '24px',
    padding: '48px 24px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    textAlign: 'center' as const,
    gap: '16px',
    cursor: 'pointer',
  },
  iconRing: {
    width: '64px',
    height: '64px',
    borderRadius: '32px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-color)',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  uploadTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  uploadSub: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: '1.4',
    maxWidth: '280px',
  },
  uploadAltRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  altBtn: {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    borderRadius: '12px',
    padding: '12px 0',
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  scanContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    gap: '24px',
    marginTop: '12px',
  },
  scanCard: {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: '4/3',
    borderRadius: '20px',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
    backgroundColor: '#000',
  },
  scanImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
    opacity: 0.65,
  },
  scanLine: {
    position: 'absolute' as const,
    left: 0,
    width: '100%',
    height: '4px',
    background: 'linear-gradient(90deg, transparent, #00f2fe, transparent)',
    boxShadow: '0 0 12px #00f2fe',
    animation: 'scan 2s linear infinite',
  },
  loaderStatus: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center' as const,
    textAlign: 'center' as const,
    gap: '8px',
  },
  loaderText: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#f4f4f5',
  },
  loaderSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    maxWidth: '300px',
    lineHeight: '1.4',
  },
  cancelBtn: {
    backgroundColor: 'rgba(255, 94, 98, 0.1)',
    color: '#ff5e62',
    border: '1px solid rgba(255, 94, 98, 0.2)',
    borderRadius: '12px',
    padding: '10px 24px',
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center' as const,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  previewImageContainer: {
    position: 'relative' as const,
    width: '100%',
    aspectRatio: '16/9',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '1px solid var(--border-color)',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  changePhotoBtn: {
    position: 'absolute' as const,
    bottom: '12px',
    right: '12px',
    backgroundColor: 'rgba(9, 9, 11, 0.75)',
    border: '1px solid var(--border-color)',
    borderRadius: '8px',
    padding: '6px 12px',
    color: 'var(--text-primary)',
    fontSize: '11px',
    fontWeight: 600,
    backdropFilter: 'blur(4px)',
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: '10px',
    backgroundColor: 'rgba(255, 94, 98, 0.08)',
    border: '1px solid rgba(255, 94, 98, 0.2)',
    borderRadius: '12px',
    padding: '12px',
    color: '#ff5e62',
  },
  formSection: {
    backgroundColor: 'var(--bg-card)',
    borderRadius: '16px',
    padding: '16px',
    border: '1px solid var(--border-color)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  sectionHeading: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-color)',
    paddingBottom: '8px',
    marginBottom: '4px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  label: {
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--text-secondary)',
  },
  textInput: {
    width: '100%',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
  },
  actionRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginTop: '12px',
  },
  primaryBtn: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: 'var(--text-primary)',
    color: 'var(--bg-dark)',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 0',
    fontSize: '14px',
    fontWeight: 600,
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    borderRadius: '12px',
    padding: '14px 0',
    fontSize: '14px',
    fontWeight: 600,
  },
  uploadAltRow3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  webcamActionRow: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    width: '100%',
    marginTop: '10px',
    padding: '0 20px',
  },
  webcamCancelBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-secondary)',
    borderRadius: '12px',
    padding: '12px 20px',
    fontSize: '13px',
    fontWeight: 600,
  },
  shutterBtn: {
    width: '64px',
    height: '64px',
    borderRadius: '32px',
    border: '3px solid #cbf600',
    backgroundColor: 'transparent',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 0,
    cursor: 'pointer',
  },
  shutterInner: {
    width: '46px',
    height: '46px',
    borderRadius: '23px',
    backgroundColor: '#ffffff',
  },
};
