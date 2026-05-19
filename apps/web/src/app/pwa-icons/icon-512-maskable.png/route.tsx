import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f1117 0%, #111827 100%)',
        }}
      >
        <div
          style={{
            width: 512,
            height: 512,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 356,
              height: 356,
              borderRadius: 96,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
            }}
          >
            <div
              style={{
                color: '#ffffff',
                fontSize: 196,
                fontWeight: 800,
                lineHeight: 1,
              }}
            >
              H
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    },
  );
}
