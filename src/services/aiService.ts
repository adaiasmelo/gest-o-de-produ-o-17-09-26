
export async function extractProductionData(base64Image: string) {
    try {
        const response = await fetch('/api/extract-production', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ base64Image })
        });
        
        if (!response.ok) {
            throw new Error('Falha ao extrair dados da imagem');
        }
        
        return await response.json();
    } catch (error) {
        console.error('Extraction service error:', error);
        throw error;
    }
}
