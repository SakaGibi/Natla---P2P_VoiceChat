// soundEffects.js - Soundpad & Effect Management
const state = require('../state/appState');
const socketService = require('../socket/socketService');
const audioEngine = require('./audioEngine'); // Import AudioEngine
const dom = require('../ui/dom');

const soundList = [
    { file: 'fahh_effect', title: 'Fahh Efekti', short: 'fahh'},   
    { file: 'ahhhhhhh_effect', title: 'Ahhhhhhh Efekti', short: 'aaah'},     
    { file: 'besili_camis_effect', title: 'besili camış', short: 'besili camış' },     
    { file: 'denyo_dangalak_effect', title: 'denyo mu dangalak mı?', short: 'denyo' },
    { file: 'deplasman_yasağı_effect', title: 'deplasman yarağı', short: 'dep. yasak' },
    { file: 'levo_rage_effect', title: 'harika bir oyun', short: 'işte bu' },
    { file: 'masaj_salonu_effect', title: 'mecidiyeköy masaj salonu', short: 'masaj salonu' },
    { file: 'neden_ben_effect', title: 'Neden dede neden beni seçtin', short: 'neden dede' },
    { file: 'samsun_anlık_effect', title: 'adalet mahallesinde gaza', short: 'Samsun Anlık' },
    { file: 'simdi_hoca_effect', title: 'şimdi hocam, position is obvious', short: 'Şimdi Hoca' },
    { file: 'soru_yanlısmıs_effect', title: 'Yauv sen yanlış yapmadın, soru yanlışmış yauv', short: 'Soru Yanlışmış Yauv' },
    { file: 'çok_zor_ya_effect', title: 'çok zor ya', short: 'çok zor ya' },
    { file: 'sus_artık_effect', title: 'yeter be sus artık', short: 'sus artık' },
    { file: 'buz_bira_effect', title: 'buz gibi bira var mı?', short: 'buz bira' },
    { file: 'osu_effect', title: 'yankılı osuruk', short: 'osuruk' },
    { file: 'aglama_oyna_Effect', title: 'ağlama hade oyna', short: 'ağlama oyna' }
];

function initSoundpad() {
    const buttons = document.querySelectorAll('.soundpad-btn');
    
    buttons.forEach((btn, index) => {
        const soundData = soundList[index];
        
        if (soundData) {
            btn.innerText = soundData.short;
            btn.title = soundData.title;

            btn.onclick = () => {
                // 1. Status Checks
                if (!state.isConnected) return;
                if (state.isDeafened) return;

                const fileName = soundData.file + ".mp3";

                // 2. Play locally
                // Logic handled in audioEngine
                audioEngine.playLocalSound(fileName); 

                // 3. Send to server
                socketService.send({
                    type: 'sound-effect',
                    effectName: fileName
                });
            };
        }
    });
}

module.exports = { initSoundpad };