const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export async function verifySingleEmail(email) {
  const response = await fetch(`${API_URL}/api/verify-single`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Verification failed');
  }

  return response.json();
}

export async function verifyCSV(file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/api/verify-csv`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'CSV verification failed');
  }

  return response.json();
}

export function downloadFile(downloadUrl) {
  const link = document.createElement('a');
  link.href = `${API_URL}${downloadUrl}`;
  link.download = downloadUrl.split('/').pop();
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
