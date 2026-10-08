if (typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js', { updateViaCache: 'none' })
      .catch(error => console.warn('Offline support could not be initialized.', error));
  }, { once: true });
}
