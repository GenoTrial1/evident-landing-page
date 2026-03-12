const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const parseRgb = (value) => {
  if (!value) {
    return null;
  }
  const rgbMatch =
    value.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i) ||
    value.match(/rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,/i);
  if (rgbMatch) {
    return {
      r: Number(rgbMatch[1]),
      g: Number(rgbMatch[2]),
      b: Number(rgbMatch[3]),
    };
  }
  const hexMatch = value.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }
  return null;
};

const blendRgb = (colorA, colorB, t = 0.5) => ({
  r: Math.round(colorA.r + (colorB.r - colorA.r) * t),
  g: Math.round(colorA.g + (colorB.g - colorA.g) * t),
  b: Math.round(colorA.b + (colorB.b - colorA.b) * t),
});

const updateOrbLines = () => {
  const bg = document.querySelector('.bg');
  const canvas = document.querySelector('.orb-lines');
  const orbOne = document.querySelector('.orb-one:not(.orb-flat)');
  const orbTwo = document.querySelector('.orb-two:not(.orb-flat)');
  const orbThree = document.querySelector('.orb-three:not(.orb-flat)');
  const orbFour = document.querySelector('.orb-four:not(.orb-flat)');
  const orbFourFlat = document.querySelector('.orb-four.orb-flat');

  if (!bg || !canvas || !orbOne || !orbTwo || !orbThree) {
    return;
  }

  const bgRect = bg.getBoundingClientRect();
  const orbs = [orbOne, orbTwo, orbThree].map((orb) => {
    const rect = orb.getBoundingClientRect();
    return {
      x: rect.left - bgRect.left + rect.width / 2,
      y: rect.top - bgRect.top + rect.height / 2,
      r: Math.min(rect.width, rect.height) / 2,
      color:
        getComputedStyle(orb).getPropertyValue('--line-color').trim() ||
        '#0f0f0f',
      alpha: 1,
    };
  });

  const orbFourData = orbFour
    ? (() => {
        const rect = orbFour.getBoundingClientRect();
        return {
          x: rect.left - bgRect.left + rect.width / 2,
          y: rect.top - bgRect.top + rect.height / 2,
          r: Math.min(rect.width, rect.height) / 2,
          color:
            getComputedStyle(orbFour).getPropertyValue('--line-color').trim() ||
            '#84c318',
          alpha: 1,
        };
      })()
    : null;

  const width = bgRect.width;
  const height = bgRect.height;
  const dpr = window.devicePixelRatio || 1;

  if (
    canvas.width !== Math.floor(width * dpr) ||
    canvas.height !== Math.floor(height * dpr)
  ) {
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const lines = [
    { a: orbs[0], b: orbs[1], minWidth: 6, maxWidth: 10 },  // purple-blue (base)
    { a: orbs[1], b: orbs[2], minWidth: 10, maxWidth: 50 }, // blue-white (thickest)
    { a: orbs[0], b: orbs[2], minWidth: 8, maxWidth: 14 },  // purple-white (thicker)
  ];

  const docHeight = document.documentElement.scrollHeight;
  const viewHeight = window.innerHeight;
  const maxScroll = Math.max(docHeight - viewHeight, 1);
  const progress = clamp(window.scrollY / (maxScroll * 0.5), 0, 1);
  const orbFourRaw = clamp(window.scrollY / maxScroll, 0, 1);
  const orbFourScaleProgress = clamp(window.scrollY / (maxScroll * 0.4), 0, 1);
  const orbFourLineProgress = clamp((orbFourRaw - 0.15) / 0.25, 0, 1);

  if (orbFour && orbFourFlat) {
    orbFour.style.setProperty('--orb-scale', orbFourScaleProgress);
    orbFourFlat.style.setProperty('--orb-scale', orbFourScaleProgress);
  }

  if (orbFourData) {
    const startColor = parseRgb(orbs[0].color);
    const endColor = parseRgb(orbFourData.color);
    if (startColor && endColor) {
      const blend = blendRgb(startColor, endColor, 0.5);
      lines.push({
        a: orbFourData,
        b: orbs[0],
        color: `rgb(${blend.r}, ${blend.g}, ${blend.b})`,
        alpha: 1,
        progress: orbFourLineProgress,
        minVisible: 0,
        minWidth: 9,
        maxWidth: 16,
      });
    } else {
      lines.push({
        a: orbFourData,
        b: orbs[0],
        color: orbs[0].color,
        alpha: 1,
        progress: orbFourLineProgress,
        minVisible: 0,
        minWidth: 9,
        maxWidth: 16,
      });
    }
  }

  lines.forEach(
    ({
      a,
      b,
      color: overrideColor,
      alpha: overrideAlpha,
      progress: overrideProgress,
      minVisible: overrideMinVisible,
      minWidth: overrideMinWidth,
      maxWidth: overrideMaxWidth,
    }) => {
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) {
      return;
    }

    const minVisible =
      overrideMinVisible === undefined
        ? Math.min(length, Math.max(0, a.r - 8))
        : overrideMinVisible;
    const lineProgress = overrideProgress ?? progress;
    const visible = minVisible + (length - minVisible) * lineProgress;
    const maxWidth = overrideMaxWidth ?? 10;
    const minWidth = overrideMinWidth ?? 6;
    const steps = 72;
    const tEnd = clamp(visible / length, 0, 1);
    const resolvedColor = parseRgb(overrideColor || a.color) || {
      r: 15,
      g: 15,
      b: 15,
    };
    const resolvedAlpha = overrideAlpha ?? a.alpha;

    ctx.strokeStyle = `rgba(${resolvedColor.r}, ${resolvedColor.g}, ${resolvedColor.b}, ${resolvedAlpha})`;
    ctx.lineCap = 'round';

    for (let i = 0; i < steps; i += 1) {
      const t0 = (i / steps) * tEnd;
      const t1 = ((i + 1) / steps) * tEnd;

      if (t0 >= tEnd) {
        break;
      }

      const mid = (t0 + t1) / 2;
      const widthFactor = Math.pow(2 * mid - 1, 2);
      const lineWidth = minWidth + (maxWidth - minWidth) * widthFactor;

      const x0 = a.x + (b.x - a.x) * t0;
      const y0 = a.y + (b.y - a.y) * t0;
      const x1 = a.x + (b.x - a.x) * t1;
      const y1 = a.y + (b.y - a.y) * t1;

      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
  });
};

const wireVimeoPlaybackOnView = () => {
  const iframe = document.querySelector('.video-frame iframe');
  const frame = document.querySelector('.video-frame');
  const overlay = document.querySelector('[data-video-overlay]');
  const volumeToggle = document.querySelector('[data-video-volume-toggle]');
  const volumePanel = document.querySelector('[data-video-volume-panel]');
  const volumeInput = document.querySelector('[data-video-volume]');
  const progressInput = document.querySelector('[data-video-progress]');
  const timeReadout = document.querySelector('[data-video-time]');
  if (!iframe) {
    return;
  }

  if (!window.Vimeo || !window.Vimeo.Player) {
    return;
  }

  const player = new window.Vimeo.Player(iframe);
  let duration = 0;
  let isScrubbing = false;
  const defaultVolume = 0.3;
  let activeVolume = defaultVolume;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
    const total = Math.floor(seconds);
    const minutes = Math.floor(total / 60);
    const secs = String(total % 60).padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  const updateTimeReadout = (current) => {
    if (!timeReadout) {
      return;
    }
    timeReadout.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
  };

  const setPauseUi = (isPaused) => {
    if (frame) {
      frame.classList.toggle('is-paused', isPaused);
    }
  };

  const setVolumeUi = (volume, isMuted) => {
    if (!volumeToggle || !volumeInput) {
      return;
    }
    volumeInput.value = String(Math.max(0, Math.min(1, volume)));
    const mutedState = isMuted || volume === 0;
    volumeToggle.classList.toggle('is-muted', mutedState);
    volumeToggle.setAttribute('aria-label', mutedState ? 'Unmute and open volume slider' : 'Open volume slider');
  };

  const setVolumePanel = (isOpen) => {
    if (!volumePanel) {
      return;
    }
    volumePanel.classList.toggle('is-open', isOpen);
  };

  const togglePlayback = () => {
    player.getPaused().then((isPaused) => {
      if (isPaused) {
        player.play().then(() => {
          if (frame) {
            frame.classList.add('is-playing');
          }
          setPauseUi(false);
        }).catch(() => {});
      } else {
        player.pause().then(() => {
          setPauseUi(true);
        }).catch(() => {});
      }
    }).catch(() => {});
  };

  player.ready().then(() => {
    player.setMuted(true).catch(() => {});
    player.setVolume(0).catch(() => {});
    player.setLoop(true).catch(() => {});
    setVolumeUi(0, true);
    setPauseUi(true);
    player.getDuration().then((value) => {
      duration = value || 0;
      updateTimeReadout(0);
    }).catch(() => {});
    player.play().then(() => {
      if (frame) {
        frame.classList.add('is-playing');
      }
      setPauseUi(false);
    }).catch(() => {});
  }).catch(() => {});

  player.on('durationchange', (event) => {
    duration = event.duration || 0;
    updateTimeReadout(event.seconds || 0);
  });

  player.on('timeupdate', (event) => {
    if (progressInput && !isScrubbing && duration > 0) {
      progressInput.value = String((event.seconds / duration) * 100);
    }
    updateTimeReadout(event.seconds || 0);
  });

  player.on('play', () => {
    setPauseUi(false);
  });

  player.on('pause', () => {
    setPauseUi(true);
  });

  player.on('volumechange', (event) => {
    const isMuted = event.volume === 0 || event.muted === true;
    setVolumeUi(event.volume, isMuted);
    if (!isMuted && event.volume > 0) {
      activeVolume = event.volume;
    }
  });

  if (overlay) {
    overlay.addEventListener('click', (event) => {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('input[type="range"], [data-video-volume-toggle]')
      ) {
        return;
      }
      if (volumePanel && volumePanel.classList.contains('is-open')) {
        setVolumePanel(false);
        return;
      }
      setVolumePanel(false);
      togglePlayback();
    });
  }

  if (volumeToggle) {
    volumeToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      player.getVolume().then((currentVolume) => {
        player.getMuted().then((isMuted) => {
          if (isMuted || currentVolume === 0) {
            player.setMuted(false).catch(() => {});
            player.setVolume(defaultVolume).catch(() => {});
            activeVolume = defaultVolume;
          }
          if (volumePanel) {
            setVolumePanel(!volumePanel.classList.contains('is-open'));
          }
        }).catch(() => {});
      }).catch(() => {});
    });
  }

  if (volumeInput) {
    volumeInput.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    volumeInput.addEventListener('input', () => {
      const nextVolume = Number(volumeInput.value);
      if (!Number.isFinite(nextVolume)) {
        return;
      }
      player.setVolume(nextVolume).catch(() => {});
      player.setMuted(nextVolume === 0).catch(() => {});
      if (nextVolume > 0) {
        activeVolume = nextVolume;
      }
      setVolumePanel(true);
    });
  }

  if (progressInput) {
    progressInput.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    progressInput.addEventListener('pointerdown', () => {
      isScrubbing = true;
    });
    progressInput.addEventListener('pointerup', () => {
      isScrubbing = false;
    });
    progressInput.addEventListener('input', () => {
      if (duration <= 0) {
        return;
      }
      const target = (Number(progressInput.value) / 100) * duration;
      if (Number.isFinite(target)) {
        player.setCurrentTime(target).catch(() => {});
      }
    });
  }

  document.addEventListener('click', (event) => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    if (event.target.closest('.video-volume-wrap')) {
      return;
    }
    setVolumePanel(false);
  });

  if (volumeToggle) {
    volumeToggle.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setVolumePanel(false);
      }
    });
  }

  if (volumeInput) {
    volumeInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        setVolumePanel(false);
      }
    });
  }

  if (frame) {
    frame.addEventListener('keydown', (event) => {
      if (event.key === ' ') {
        event.preventDefault();
        togglePlayback();
      }
    });
  }

  if (frame) {
    frame.setAttribute('tabindex', '0');
  }

  if (activeVolume > 0) {
    player.getMuted().then((isMuted) => {
      if (!isMuted) {
        player.setVolume(activeVolume).catch(() => {});
      }
    }).catch(() => {});
  }

  if (volumeInput) {
    volumeInput.value = String(defaultVolume);
  }

  if (progressInput) {
    progressInput.value = '0';
  }
};

let rafId = null;

const startOrbLineLoop = () => {
  if (rafId !== null) {
    return;
  }

  const tick = () => {
    updateOrbLines();
    rafId = window.requestAnimationFrame(tick);
  };

  rafId = window.requestAnimationFrame(tick);
};

window.addEventListener('scroll', updateOrbLines, { passive: true });
window.addEventListener('resize', updateOrbLines);
window.addEventListener('load', () => {
  updateOrbLines();
  startOrbLineLoop();
});

const wireWeb3Forms = () => {
  const form = document.querySelector('form[data-web3]');
  if (!form) {
    return;
  }

  const status = form.querySelector('[data-form-status]');
  const submitButton = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (submitButton) {
      submitButton.disabled = true;
    }
    if (status) {
      status.textContent = 'Sending...';
    }

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
      });

      if (!response.ok) {
        throw new Error('Form submission failed.');
      }

      window.location.href = '/success/';
    } catch (error) {
      if (status) {
        status.textContent = 'Something went wrong. Please try again.';
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
};

window.addEventListener('load', wireWeb3Forms);
window.addEventListener('load', wireVimeoPlaybackOnView);

const wireMobileNav = () => {
  const toggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (!toggle || !navLinks) {
    return;
  }

  const closeButton = navLinks.querySelector('.nav-close');

  toggle.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('is-open');
    document.body.classList.toggle('nav-open', isOpen);
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  if (closeButton) {
    closeButton.addEventListener('click', () => {
      navLinks.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  }

  navLinks.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      navLinks.classList.remove('is-open');
      document.body.classList.remove('nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
};

window.addEventListener('load', wireMobileNav);
