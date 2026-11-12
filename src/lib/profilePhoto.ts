export async function prepareProfilePhoto(file: File): Promise<Blob> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
    throw new Error('Choose a JPG, PNG or WebP image under 12 MB.');
  }

  const image = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    const crop = Math.min(image.width, image.height);
    canvas.width = canvas.height = Math.min(720, crop);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the photo.');
    context.fillStyle = '#efe7d8';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, (image.width - crop) / 2, (image.height - crop) / 2, crop, crop,
      0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('This image could not be saved.'));
      }, 'image/jpeg', 0.88);
    });
  } finally {
    image.close();
  }
}

