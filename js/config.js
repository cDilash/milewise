const config = {
    MAPBOX_TOKEN: 'pk.eyJ1IjoiZGlsYXNoMTAiLCJhIjoiY2x0MnBrNjNkMHMyZTJrcTNheGhpbDdycSJ9.pkMd94j1RxNhXOjhp9lD2A'
};

// For security in production
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    config.MAPBOX_TOKEN = 'your_production_token'; // Your production token
}
