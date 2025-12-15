const FEEDBACK_FORM_URL = 'https://forms.gle/1Ffj5TscnGr62Adg7';
const CONTACT_EMAIL = 'mailto:r.h.mediahouse.official@gmail.com';
const PRIVACY_POLICY_URL = 'privacypolicy.html';
const MAX_AUDIO_FILES = 10;
const START_DELAY_MS = 1000;


const END_CYCLE_BEEP_URL = 'default/beep.mp3';


const DEFAULT_AUDIO_CUES = [
    'default/download (1).wav',
    'default/download (2).wav',
    'default/download (3).wav',
    'default/download (4).wav',
    'default/download (5).wav',
    'default/download (6).wav',
    'default/download (7).wav',
    'default/download (8).wav',
    'default/download.wav'
];


let uploadedAudioFiles = [];
let currentAudioSource = 'default';
let sessionTimer = null;
let isPaused = false;
let totalSessionSeconds = 0;
let secondsElapsed = 0;
let cueIntervalSeconds = 0;
let nextCueTime = 0;

let sessionStartTime = null;
let totalPomodoroSessions = 0;
let breakDurationMinutes = 0;
let currentSessionNumber = 0;
let isFocusPeriod = true;



const feedbackButton = document.getElementById('feedback-btn');
const contactUsButton = document.getElementById('contact-us-btn');
const privacyPolicyButton = document.getElementById('privacy-policy-btn');


const uploadAudioButton = document.getElementById('upload-audio-btn');
const defaultAudioButton = document.getElementById('default-audio-btn');


const homeContainer = document.querySelector('.container:not(#config-container):not(#focus-session-container)');
const configContainer = document.getElementById('config-container');
const focusSessionContainer = document.getElementById('focus-session-container');


const backToHomeButton = document.getElementById('back-to-home-btn');
const startSessionButton = document.getElementById('start-session-btn');
const intervalInput = document.getElementById('interval-minutes');
const durationPresets = document.getElementById('duration-presets');
const sessionDurationValue = document.getElementById('session-duration-value');
const numSessionsInput = document.getElementById('num-sessions');
const breakDurationInput = document.getElementById('break-duration');
const configTitleSource = document.getElementById('config-title-source');


const uploadModalBackdrop = document.getElementById('upload-modal-backdrop');
const selectFilesButton = document.getElementById('select-files-btn');
const audioFileInput = document.getElementById('audio-file-input');
const audioListContainer = document.getElementById('audio-list-container');
const fileCountStatus = document.getElementById('file-count-status');
const noFilesMessage = document.getElementById('no-files-message');
const submitUploadedButton = document.getElementById('submit-uploaded-btn');
const closeUploadModalButton = document.getElementById('close-upload-modal-btn');

const sessionTimerDisplay = document.getElementById('session-timer-display');
const cueTimerDisplay = document.getElementById('cue-timer-display');
const pauseSessionButton = document.getElementById('pause-session-btn');
const endSessionButton = document.getElementById('end-session-btn');
const nextCueLabel = document.getElementById('next-cue-label');



function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function playRandomCue() {
    let audioSourceArray = (currentAudioSource === 'default') ? DEFAULT_AUDIO_CUES : uploadedAudioFiles;
    
    if (audioSourceArray.length === 0) {
        console.warn("No audio cues available to play.");
        return;
    }

    const randomIndex = Math.floor(Math.random() * audioSourceArray.length);
    const audioCue = audioSourceArray[randomIndex];

    let audioURL;
    if (currentAudioSource === 'uploaded') {
        audioURL = URL.createObjectURL(audioCue);
    } else {
        audioURL = audioCue;
    }

    const audio = new Audio(audioURL);
    
    
    setTimeout(() => {
        audio.play().catch(e => {
            console.error("Audio playback failed (check browser console).", e);
        });
        
        if (currentAudioSource === 'uploaded') {
            audio.onended = () => URL.revokeObjectURL(audioURL);
        }

    }, START_DELAY_MS);
}



function startCyclePeriod(durationSeconds) {
    if (sessionTimer) clearInterval(sessionTimer);
    
    secondsElapsed = 0;
    totalSessionSeconds = durationSeconds;
    isPaused = false;
    
    sessionStartTime = Date.now();
    
    let cycleType = isFocusPeriod ? "FOCUS" : "BREAK";
    let sessionDisplay = isFocusPeriod ? `${currentSessionNumber} / ${totalPomodoroSessions}` : "REST";

    document.getElementById('focus-title').textContent = `${cycleType} - Session ${sessionDisplay}`;
    document.getElementById('time-remaining-label').textContent = `${cycleType} Time Remaining:`;
    
    if (isFocusPeriod) {
        nextCueLabel.classList.remove('hidden');
        nextCueTime = cueIntervalSeconds;
        cueTimerDisplay.textContent = formatTime(nextCueTime);
    } else {
        nextCueLabel.classList.add('hidden');
    }
    
    sessionTimerDisplay.textContent = formatTime(totalSessionSeconds);
    pauseSessionButton.textContent = "Pause";
    
    sessionTimer = setInterval(updateSessionTimer, 1000);
}


function updateSessionTimer() {
    if (isPaused || !sessionStartTime) return;

    const timeDifference = Date.now() - sessionStartTime;
    const currentSecondsElapsed = Math.floor(timeDifference / 1000); 

    const missedSeconds = currentSecondsElapsed - secondsElapsed;
    
    if (missedSeconds < 1) return; 

    secondsElapsed = currentSecondsElapsed;

    const remainingTime = totalSessionSeconds - secondsElapsed;
    
    
    if (isFocusPeriod) {
        nextCueTime -= missedSeconds;
        cueTimerDisplay.textContent = formatTime(nextCueTime > 0 ? nextCueTime : 0);
        
        while (nextCueTime <= 0) {
            playRandomCue();
            nextCueTime += cueIntervalSeconds;
        }
    }

    
    sessionTimerDisplay.textContent = formatTime(remainingTime > 0 ? remainingTime : 0);

    
    if (secondsElapsed >= totalSessionSeconds) {
        clearInterval(sessionTimer);
        
        
        const transitionBeep = new Audio(END_CYCLE_BEEP_URL);
        transitionBeep.play().catch(e => console.error("End cycle beep failed:", e));

        if (isFocusPeriod) {
            
            if (currentSessionNumber < totalPomodoroSessions) {
                isFocusPeriod = false;
                const breakSeconds = breakDurationMinutes * 60;
                startCyclePeriod(breakSeconds);
            } else {
                
                stopSession("All Pomodoro Sessions Complete! Great work!");
            }
        } else {
            
            currentSessionNumber++;
            isFocusPeriod = true;
            
            const focusMinutes = parseInt(sessionDurationValue.value);
            startCyclePeriod(focusMinutes * 60);
        }
    }
}


function togglePauseSession() {
    isPaused = !isPaused;
    if (isPaused) {
        pauseSessionButton.textContent = "Resume";
        pauseSessionButton.classList.remove('btn-secondary');
        pauseSessionButton.classList.add('btn-accent');
    } else {
        sessionStartTime = Date.now() - (secondsElapsed * 1000); 
        pauseSessionButton.textContent = "Pause";
        pauseSessionButton.classList.remove('btn-accent');
        pauseSessionButton.classList.add('btn-secondary');
    }
}

function stopSession(message = "Session Stopped.") {
    if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
    }
    
    currentSessionNumber = 0;
    isFocusPeriod = true;
    sessionStartTime = null;
    
    alert(message);
    showHome();
}

function startFocusSession(interval, duration, source) {
    
    totalPomodoroSessions = parseInt(numSessionsInput.value);
    breakDurationMinutes = parseInt(breakDurationInput.value);
    
    
    if (totalPomodoroSessions < 1 || breakDurationMinutes < 1) {
        alert("Please ensure the number of sessions and break duration are at least 1.");
        return;
    }
    
    
    cueIntervalSeconds = interval * 60;

    currentSessionNumber = 1;
    isFocusPeriod = true;
    
    
    const focusSeconds = duration * 60;
    startCyclePeriod(focusSeconds);

    
    if (configContainer) configContainer.classList.add('hidden');
    if (focusSessionContainer) focusSessionContainer.classList.remove('hidden');
}


function showHome() {
    if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
    }
    
    currentSessionNumber = 0;
    isFocusPeriod = true;
    sessionStartTime = null;
    
    if (configContainer) configContainer.classList.add('hidden');
    if (uploadModalBackdrop) uploadModalBackdrop.classList.add('hidden');
    if (focusSessionContainer) focusSessionContainer.classList.add('hidden');
    if (homeContainer) homeContainer.classList.remove('hidden');
}

function showDefaultConfig() {
    if (homeContainer) homeContainer.classList.add('hidden');
    if (configContainer) configContainer.classList.remove('hidden');
    
    if (configTitleSource) {
        configTitleSource.textContent = (currentAudioSource === 'default') ? 'Default' : 'Custom';
    }
}

function showUploadModal() {
    if (uploadModalBackdrop) uploadModalBackdrop.classList.remove('hidden');
    updateAudioListDisplay();
}

function hideUploadModal() {
    if (uploadModalBackdrop) uploadModalBackdrop.classList.add('hidden');
}


function handleFeedbackClick() {
    try {
        window.open(FEEDBACK_FORM_URL, '_blank', 'noopener,noreferrer');
    } catch (e) {
        console.error('Failed to open feedback form:', e);
    }
}

function handleContactUsClick() {
    try {
        window.location.href = CONTACT_EMAIL;
    } catch (e) {
        console.error('Failed to open contact mailto:', e);
    }
}

function handlePrivacyPolicyClick() {
    try {
        window.open(PRIVACY_POLICY_URL, '_blank', 'noopener,noreferrer');
    } catch (e) {
        console.error('Failed to open privacy policy:', e);
    }
}


function handleUploadAudioClick() {
    currentAudioSource = 'uploaded';
    showUploadModal();
}

function handleDefaultAudioClick() {
    currentAudioSource = 'default';
    showDefaultConfig();
}

function handlePresetClick(event) {
    if (event.target.classList.contains('preset-btn')) {
        document.querySelectorAll('.preset-btn').forEach(btn => btn.classList.remove('preset-active'));
        event.target.classList.add('preset-active');
        sessionDurationValue.value = event.target.getAttribute('data-minutes');
    }
}

function handleStartSession() {
    const interval = parseInt(intervalInput.value);
    const duration = parseInt(sessionDurationValue.value);
    
    
    if (isNaN(interval) || interval < 1) {
        alert("Please ensure the reminder interval is at least 1 minute.");
        return;
    }
    if (duration > 0 && duration < 10) {
        alert("Focus duration must be at least 10 minutes or set to Indefinite.");
        return;
    }
    if (currentAudioSource === 'uploaded' && uploadedAudioFiles.length === 0) {
        alert("Please upload at least one audio file before starting a custom session.");
        return;
    }
    const sessions = parseInt(numSessionsInput.value);
    const breakTime = parseInt(breakDurationInput.value);
    if (sessions < 1 || breakTime < 1) {
        alert("Please ensure the number of sessions and break duration are valid (at least 1).");
        return;
    }
    
    
    startFocusSession(interval, duration, currentAudioSource);
}

function handleSubmitUploadedAudios() {
    if (uploadedAudioFiles.length > 0) {
        hideUploadModal();
        showDefaultConfig();
    } else {
        alert("Please upload at least one audio file.");
    }
}

function handleFileSelection(event) {
    const files = Array.from(event.target.files);
    let spaceRemaining = MAX_AUDIO_FILES - uploadedAudioFiles.length;
    let filesToAdd = files.slice(0, spaceRemaining);
    if (files.length > filesToAdd.length) {
        alert(`Maximum upload limit is ${MAX_AUDIO_FILES} files. Only ${filesToAdd.length} files were added this time.`);
    }
    filesToAdd = filesToAdd.filter(newFile =>
        !uploadedAudioFiles.some(existingFile => existingFile.name === newFile.name)
    );
    uploadedAudioFiles = uploadedAudioFiles.concat(filesToAdd);
    event.target.value = '';
    updateAudioListDisplay();
}

function handleFileRemoval(event) {
    if (event.target.classList.contains('remove-btn')) {
        const fileNameToRemove = event.target.getAttribute('data-file-name');
        const index = uploadedAudioFiles.findIndex(file => file.name === fileNameToRemove);
        if (index > -1) {
            uploadedAudioFiles.splice(index, 1);
            updateAudioListDisplay();
        }
    }
}

function updateAudioListDisplay() {
    const currentNoFilesMessage = document.getElementById('no-files-message');
    audioListContainer.innerHTML = '';
    if (uploadedAudioFiles.length === 0) {
        if (currentNoFilesMessage) audioListContainer.appendChild(currentNoFilesMessage);
        submitUploadedButton.disabled = true;
    } else {
        uploadedAudioFiles.forEach((file) => {
            const item = document.createElement('div');
            item.className = 'audio-list-item';
            item.innerHTML = `
                <span>${file.name}</span>
                <button class="remove-btn" data-file-name="${file.name}">Remove</button>
            `;
            audioListContainer.appendChild(item);
        });
        submitUploadedButton.disabled = false;
    }
    fileCountStatus.textContent = `${uploadedAudioFiles.length} / ${MAX_AUDIO_FILES} files selected`;
}


document.addEventListener('DOMContentLoaded', () => {
    
    if (feedbackButton) feedbackButton.addEventListener('click', handleFeedbackClick);
    if (contactUsButton) contactUsButton.addEventListener('click', handleContactUsClick);
    if (privacyPolicyButton) privacyPolicyButton.addEventListener('click', handlePrivacyPolicyClick); 

    
    if (uploadAudioButton) uploadAudioButton.addEventListener('click', handleUploadAudioClick);
    if (defaultAudioButton) defaultAudioButton.addEventListener('click', handleDefaultAudioClick);
    if (durationPresets) durationPresets.addEventListener('click', handlePresetClick);
    
    
    if (backToHomeButton) backToHomeButton.addEventListener('click', showHome);
    if (startSessionButton) startSessionButton.addEventListener('click', handleStartSession);
    if (pauseSessionButton) pauseSessionButton.addEventListener('click', togglePauseSession);
    if (endSessionButton) endSessionButton.addEventListener('click', () => stopSession("Session manually ended."));
    
    
    if (selectFilesButton) {
        selectFilesButton.addEventListener('click', () => {
            audioFileInput.click();
        });
    }
    if (audioFileInput) audioFileInput.addEventListener('change', handleFileSelection);
    if (audioListContainer) audioListContainer.addEventListener('click', handleFileRemoval);
    if (closeUploadModalButton) closeUploadModalButton.addEventListener('click', showHome);
    if (submitUploadedButton) submitUploadedButton.addEventListener('click', handleSubmitUploadedAudios);
    
    
    showHome();
});
