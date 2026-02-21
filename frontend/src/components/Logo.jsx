import React from 'react';
import logoImg from '../assets/logo.png';

export default function Logo({ className = "w-10 h-10", ...props }) {
    return (
        <img
            src={logoImg}
            alt="OCULAR AI Logo"
            className={`object-contain ${className}`}
            {...props}
        />
    );
}
