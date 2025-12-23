import React, { useRef, useEffect } from 'react';
import Spline from '@splinetool/react-spline';
import './BrainModel.css';

function BrainModel() {
  const splineRef = useRef(null);
  const splineInstanceRef = useRef(null);

  const onLoad = (spline) => {
    splineInstanceRef.current = spline;
    
    if (spline) {
      // Disable user interactions
      const canvas = splineRef.current?.querySelector('canvas');
      if (canvas) {
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';
        
        // Performance optimizations for smooth rendering
        canvas.style.imageRendering = 'optimizeSpeed';
        canvas.style.willChange = 'transform';
        
        // Set optimal pixel ratio for performance
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        if (spline.setPixelRatio) {
          spline.setPixelRatio(dpr);
        }
      }

      // Enable auto-rotation
      enableAutoRotation(spline);
    }
  };

  const enableAutoRotation = (spline) => {
    if (!spline) return;
    
    // Try multiple approaches to enable auto-rotation
    const tryEnableRotation = () => {
      try {
        // Method 1: Access through application
        const app = spline._application || spline.application;
        if (app && app.controls) {
          if (app.controls.target) {
            app.controls.target.set(0, 0, 0);
          }
          if (app.controls.autoRotate !== undefined) {
            app.controls.autoRotate = true;
            app.controls.autoRotateSpeed = 0.5;
          }
          if (app.controls.update) {
            app.controls.update();
          }
          return true;
        }
        
        // Method 2: Access through runtime
        const runtime = spline._runtime || spline.runtime;
        if (runtime) {
          if (runtime.camera && runtime.camera.controls) {
            if (runtime.camera.controls.target) {
              runtime.camera.controls.target.set(0, 0, 0);
            }
            if (runtime.camera.controls.autoRotate !== undefined) {
              runtime.camera.controls.autoRotate = true;
              runtime.camera.controls.autoRotateSpeed = 0.5;
            }
            return true;
          }
          
          // Method 3: Direct access to controls
          if (runtime.controls) {
            if (runtime.controls.target) {
              runtime.controls.target.set(0, 0, 0);
            }
            if (runtime.controls.autoRotate !== undefined) {
              runtime.controls.autoRotate = true;
              runtime.controls.autoRotateSpeed = 0.5;
            }
            return true;
          }
        }
      } catch (e) {
        // Continue trying other methods
      }
      return false;
    };
    
    // Try immediately
    if (!tryEnableRotation()) {
      // Retry after a short delay (controls might not be ready yet)
      setTimeout(() => tryEnableRotation(), 100);
      setTimeout(() => tryEnableRotation(), 500);
      setTimeout(() => tryEnableRotation(), 1000);
    }
  };

  useEffect(() => {
    // Try to enable auto-rotation if spline is already loaded
    if (splineInstanceRef.current) {
      enableAutoRotation(splineInstanceRef.current);
    }
  }, []);

  return (
    <div className="brain-model-container">
      <Spline
        ref={splineRef}
        scene="https://prod.spline.design/HyjlGdV54ZN59aML/scene.splinecode"
        className="spline-viewer"
        onLoad={onLoad}
      />
    </div>
  );
}

export default BrainModel;

