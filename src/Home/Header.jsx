import React from 'react';
import './Header.css';

const Header = () => {
    return (
        <header className="header">
            <div className="banner-container">
                <img
                    src="/images/header.png"
                    alt="Website Banner"
                    className="banner-image"
                />
            </div>
        </header>
    );
};

export default Header;