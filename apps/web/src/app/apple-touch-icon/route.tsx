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
          background: '#0f1117',
        }}
      >
        <div
          style={{
            width: 132,
            height: 132,
            borderRadius: 34,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)',
          }}
        >
          <div
            style={{
              color: '#ffffff',
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1,
            }}
          >
            H
          </div>
        </div>
      </div>
    ),
    {
      width: 180,
      height: 180,
    },
  );
}
