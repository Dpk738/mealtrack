import React, { useState, useRef, useEffect } from 'react';
import { analyzeFoodImage, analyzeFoodText } from '../gemini';
import { getSupabase } from '../supabaseClient';
import { Camera, Image as ImageIcon, Sparkles, Save, X, AlertTriangle, Utensils } from 'lucide-react';

interface CameraLogProps {
  onMealSaved: (mealData: {
    name: string;
    photo_url?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    serving_size: string;
    serving_quantity: number;
    description?: string;
  }) => Promise<void>;
  onNavigate: (tab: any) => void;
}


export default function CameraLog({ onMealSaved, onNavigate }: CameraLogProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const [description, setDescription] = useState('');

  const [textInput, setTextInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if API key exists on load
  useEffect(() => {
    const key = localStorage.getItem('geminiApiKey') || '';
    setHasApiKey(!!key);
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
    const key = localStorage.getItem('geminiApiKey') || '';
    if (!key) {
      setErrorMsg('No Gemini API Key found. Please add a key in Settings to use image analysis.');
      return;
    }
    const modelName = localStorage.getItem('geminiModel') || 'gemini-2.5-flash';

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
      setDescription(result.description || '');
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'AI recognition failed. You can still input values manually.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeText = async () => {
    const key = localStorage.getItem('geminiApiKey') || '';
    if (!key) {
      setErrorMsg('No Gemini API Key found. Please add a key in Settings to use text analysis.');
      return;
    }
    const modelName = localStorage.getItem('geminiModel') || 'gemini-2.5-flash';

    setLoading(true);
    setErrorMsg('');
    setPhoto('text');

    try {
      const result = await analyzeFoodText(textInput, key, modelName);
      
      setMealName(result.name);
      setServingSize(result.servingSize);
      setServingQuantity(result.servingQuantity);
      setCalories(result.calories);
      setProtein(result.protein);
      setCarbs(result.carbs);
      setFat(result.fat);
      setFiber(result.fiber);
      setSugar(result.sugar);
      setDescription(result.description || '');
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'AI text analysis failed. You can still input values manually.');
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
    setDescription('');
    // Set dummy photo or leave null
    setPhoto('manual');
    setErrorMsg('');
  };

  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) {
      alert('Please enter a meal name.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    let finalPhotoUrl: string | undefined = undefined;

    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error('Supabase is not configured. Please go to Setup and enter your connection details.');
      }

      if (photo && photo !== 'manual' && photo !== 'text' && photo.startsWith('data:')) {
        // Upload photo to Supabase
        const blob = dataURItoBlob(photo);
        const fileExt = 'jpg';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('meal-photos')
          .upload(filePath, blob, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (uploadError) {
          console.error('Supabase storage upload error:', uploadError);
          throw new Error(`Failed to upload photo: ${uploadError.message}`);
        }

        // Get public URL
        const { data } = supabase.storage
          .from('meal-photos')
          .getPublicUrl(filePath);

        finalPhotoUrl = data.publicUrl;
      }

      await onMealSaved({
        name: mealName.trim(),
        photo_url: finalPhotoUrl,
        calories: Math.max(0, Number(calories) || 0),
        protein: Math.max(0, Number(protein) || 0),
        carbs: Math.max(0, Number(carbs) || 0),
        fat: Math.max(0, Number(fat) || 0),
        fiber: Math.max(0, Number(fiber) || 0),
        sugar: Math.max(0, Number(sugar) || 0),
        serving_size: servingSize.trim(),
        serving_quantity: Math.max(0.1, Number(servingQuantity) || 1),
        description: description.trim() || undefined
      });

      // Reset screen
      setPhoto(null);
      setTextInput('');
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save meal log.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPhoto(null);
    setLoading(false);
    setErrorMsg('');
    setTextInput('');
  };

  const triggerCamera = () => {
    const input = fileInputRef.current;
    if (input) {
      input.setAttribute('capture', 'environment');
      input.setAttribute('accept', 'image/*');
      input.click();
    }
  };

  const triggerGallery = () => {
    const input = fileInputRef.current;
    if (input) {
      input.removeAttribute('capture');
      input.setAttribute('accept', 'image/png, image/jpeg, image/jpg, image/webp');
      input.click();
    }
  };

  return (
    <div className="animate-slide-up" style={styles.container}>
      <h2 style={styles.title}>Log Food</h2>

      {/* API Key Warning */}
      {!hasApiKey && (
        <div style={styles.warningAlert}>
          <AlertTriangle size={18} style={{ color: 'var(--text-primary)', flexShrink: 0 }} />
          <div style={styles.warningTextContainer}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>API Key Missing</span>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Add a Gemini API key in Settings to unlock automatic food photo & description recognition.
            </p>
            <button onClick={() => onNavigate('settings')} style={styles.warningLinkBtn}>
              Go to Settings
            </button>
          </div>
        </div>
      )}

      {/* Main Upload / Camera Triggers */}
      {!photo && !isWebcamActive && (
        <div className="upload-zone-wrapper" style={styles.uploadZoneContainer}>
          <div style={styles.dropZone} onClick={triggerCamera}>
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
            <button type="button" style={styles.altBtn} onClick={triggerGallery}>
              <ImageIcon size={14} style={{ marginRight: 4 }} /> Gallery
            </button>
            <button type="button" style={styles.altBtn} onClick={handleManualInput}>
              Manual Log
            </button>
          </div>

          {/* Text sentence logging option */}
          <div style={styles.textLogContainer}>
            <div style={styles.textLogDivider}>
              <span style={styles.dividerText}>OR LOG WITH DESCRIPTION</span>
            </div>
            <div style={styles.textInputWrapper}>
              <textarea
                placeholder="e.g. 100 g of rice and 200 g of chicken breast"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                style={styles.textLogArea}
              />
              <button
                type="button"
                style={styles.textAnalyzeBtn}
                onClick={handleAnalyzeText}
                disabled={!textInput.trim()}
              >
                <Sparkles size={14} style={{ marginRight: 6 }} /> Analyze with Gemini
              </button>
            </div>
          </div>
          
          <input
            type="file"
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
              <AlertTriangle size={16} style={{ color: 'var(--text-primary)', flexShrink: 0 }} />
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
            {photo !== 'text' ? (
              <img src={photo} alt="Food analysis" style={styles.scanImage} />
            ) : (
              <div style={styles.mealPhotoPlaceholder}>
                <Sparkles size={48} className="animate-pulse-glow" style={{ color: 'var(--text-primary)' }} />
              </div>
            )}
            <div style={styles.scanLine} />
          </div>
          
          <div style={styles.loaderStatus}>
            <Sparkles size={20} className="animate-pulse-glow" style={{ color: '#cbf600' }} />
            <span style={styles.loaderText} className="animate-pulse-glow">
              {photo === 'text' ? 'Gemini AI text analysis in progress...' : 'Gemini Vision recognition in progress...'}
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
        saving ? (
          <div style={styles.scanContainer} className="animate-fade-in">
            <div style={styles.scanCard}>
              {photo !== 'manual' && photo !== 'text' ? (
                <img src={photo} alt="Food saving" style={styles.scanImage} />
              ) : (
                <div style={styles.mealPhotoPlaceholder}>
                  <Utensils size={32} style={{ color: 'var(--text-primary)' }} />
                </div>
              )}
              <div style={styles.scanLine} />
            </div>
            
            <div style={styles.loaderStatus}>
              <Sparkles size={20} className="animate-pulse-glow" style={{ color: '#cbf600' }} />
              <span style={styles.loaderText} className="animate-pulse-glow">
                Saving to cloud database...
              </span>
              <p style={styles.loaderSub}>Uploading image and inserting record into Supabase PostgreSQL...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form} className="animate-fade-in">
            <div className="camera-review-grid" style={{ width: '100%' }}>
              {/* Left Column: Image Preview and Cancel/Save buttons */}
              <div className="camera-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
                {photo !== 'manual' && photo !== 'text' && (
                  <div style={styles.previewImageContainer}>
                    <img src={photo} alt="Food preview" style={styles.previewImage} />
                    <button type="button" onClick={handleCancel} style={styles.changePhotoBtn}>
                      Change Photo
                    </button>
                  </div>
                )}

                {photo === 'text' && (
                  <div style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '16px',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#cbf600', fontSize: '13px', fontWeight: 600 }}>
                      <Sparkles size={14} /> Description Analysed
                    </div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.4' }}>
                      "{textInput}"
                    </span>
                  </div>
                )}
                
                <div style={styles.actionRow}>
                  <button type="button" onClick={handleCancel} style={styles.secondaryBtn}>
                    Cancel
                  </button>
                  <button type="submit" style={styles.primaryBtn}>
                    <Save size={16} style={{ marginRight: 6 }} /> Save Log
                  </button>
                </div>
              </div>

              {/* Right Column: Nutrition Inputs */}
              <div className="camera-right-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
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

                  <div style={styles.inputGroup}>
                    <label style={styles.label}>Itemized Breakdown</label>
                    <textarea
                      placeholder="Gemini will auto-estimate portions and calories for each item..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      style={{
                        ...styles.textInput,
                        height: '60px',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontFamily: 'inherit',
                        resize: 'none'
                      }}
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
              </div>
            </div>
          </form>
      ))}
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
    backgroundColor: 'rgba(203, 246, 0, 0.05)',
    border: '1px solid var(--border-color)',
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
    color: '#cbf600',
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
    background: 'linear-gradient(90deg, transparent, #cbf600, transparent)',
    boxShadow: '0 0 12px #cbf600',
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
    backgroundColor: 'rgba(203, 246, 0, 0.05)',
    color: '#cbf600',
    border: '1px solid rgba(203, 246, 0, 0.15)',
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
    backgroundColor: 'rgba(203, 246, 0, 0.05)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    padding: '12px',
    color: '#cbf600',
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
  mealPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  textLogContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginTop: '20px',
    width: '100%',
  },
  textLogDivider: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    width: '100%',
    borderBottom: '1px solid var(--border-color)',
    lineHeight: '0.1em',
    margin: '10px 0',
  },
  dividerText: {
    background: 'var(--bg-dark)',
    padding: '0 10px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    letterSpacing: '0.5px',
  },
  textInputWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    width: '100%',
  },
  textLogArea: {
    width: '100%',
    height: '80px',
    padding: '12px 14px',
    borderRadius: '12px',
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'none' as const,
    outline: 'none',
  },
  textAnalyzeBtn: {
    width: '100%',
    padding: '12px 0',
    border: '1px solid var(--text-primary)',
    borderRadius: '12px',
    backgroundColor: 'rgba(203, 246, 0, 0.08)',
    color: 'var(--text-primary)',
    fontSize: '13px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    cursor: 'pointer',
  },
};
