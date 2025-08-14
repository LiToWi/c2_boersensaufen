import React from 'react';

const spinnerStyle: React.CSSProperties = {
    width: '48px',
    height: '48px',
    border: '6px solid #f3f3f3',
    borderTop: '6px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: 'auto',
    display: 'block',
};

const keyframes = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

const LoadingAnimation: React.FC = () => (
    <>
        <style>{keyframes}</style>
        <div style={spinnerStyle} aria-label="Loading" />
    </>
);

export default LoadingAnimation;
