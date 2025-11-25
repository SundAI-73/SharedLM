import React, { useState } from 'react';
import './LicenseAgreement.css';

const LicenseAgreement = ({ accepted, onAccept, onNext, onBack }) => {
  const [localAccepted, setLocalAccepted] = useState(accepted);

  const licenseText = `SHAREDLM SOFTWARE LICENSE AGREEMENT

Please read the following License agreement. You must accept the terms of this agreement before continuing with the installation.

END USER LICENSE AGREEMENT (EULA)

This End User License Agreement ("Agreement") is a legal agreement between you (either an individual or a single entity) and SharedLM ("Licensor") for the SharedLM software product identified above, which includes computer software and may include associated media, printed materials, and "online" or electronic documentation ("Software Product").

By installing, copying, or otherwise using the Software Product, you agree to be bound by the terms of this Agreement. If you do not agree to the terms of this Agreement, do not install or use the Software Product.

1. GRANT OF LICENSE
Subject to the terms and conditions of this Agreement, Licensor grants you a limited, non-exclusive, non-transferable license to install and use the Software Product on your computer or device.

2. RESTRICTIONS
You may not:
- Copy, modify, adapt, alter, translate, or create derivative works of the Software Product
- Reverse engineer, decompile, disassemble, or otherwise attempt to derive the source code of the Software Product
- Remove, alter, or obscure any proprietary notices, labels, or marks on the Software Product
- Rent, lease, lend, sell, sublicense, assign, distribute, publish, transfer, or otherwise make available the Software Product to any third party

3. INTELLECTUAL PROPERTY
The Software Product is protected by copyright laws and international copyright treaties, as well as other intellectual property laws and treaties. The Software Product is licensed, not sold.

4. TERMINATION
This Agreement is effective until terminated. Your rights under this Agreement will terminate automatically without notice if you fail to comply with any of its terms.

5. DISCLAIMER OF WARRANTIES
THE SOFTWARE PRODUCT IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NONINFRINGEMENT.

6. LIMITATION OF LIABILITY
IN NO EVENT SHALL LICENSOR BE LIABLE FOR ANY SPECIAL, INCIDENTAL, INDIRECT, OR CONSEQUENTIAL DAMAGES WHATSOEVER ARISING OUT OF OR RELATED TO YOUR USE OR INABILITY TO USE THE SOFTWARE PRODUCT.

7. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of the jurisdiction in which Licensor operates.

By clicking "I accept the agreement" and continuing with the installation, you acknowledge that you have read this Agreement, understand it, and agree to be bound by its terms and conditions.`;

  const handleAcceptChange = (value) => {
    setLocalAccepted(value);
    onAccept(value);
  };

  return (
    <div className="license-page">
      <div className="license-header">
        <h1 className="page-title">License Agreement</h1>
        <div className="step-indicator">Step 1 of 4</div>
      </div>

      <div className="license-content">
        <div className="license-instructions">
          <p>Please read the following important information before continuing.</p>
          <p>Please read the following License agreement. You must accept the terms of this agreement before continuing with the installation.</p>
        </div>

        <div className="license-text-container">
          <div className="license-text">
            {licenseText}
          </div>
        </div>

        <div className="radio-group">
          <div className="radio-option" onClick={() => handleAcceptChange(true)}>
            <input
              type="radio"
              id="accept"
              name="license"
              checked={localAccepted === true}
              onChange={() => handleAcceptChange(true)}
            />
            <label htmlFor="accept">I accept the agreement</label>
          </div>
          <div className="radio-option" onClick={() => handleAcceptChange(false)}>
            <input
              type="radio"
              id="decline"
              name="license"
              checked={localAccepted === false}
              onChange={() => handleAcceptChange(false)}
            />
            <label htmlFor="decline">I do not accept the agreement</label>
          </div>
        </div>
      </div>

      <div className="license-footer">
        <button className="btn btn-secondary" onClick={onBack} disabled>
          Back
        </button>
        <button
          className="btn btn-primary"
          onClick={onNext}
          disabled={!localAccepted}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default LicenseAgreement;

