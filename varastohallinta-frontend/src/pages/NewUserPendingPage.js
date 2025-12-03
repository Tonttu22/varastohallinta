import React from 'react';

function NewUserPendingPage({ onLogout }) {
  return (
    <div className="page-container" style={{ padding: 32, textAlign: 'center' }}>
      <h2>Rekisteröinti onnistui!</h2>
      <p>Käyttäjätilisi odottaa ylläpitäjän hyväksyntää.<br />
         Saat pääsyn järjestelmään, kun ylläpitäjä hyväksyy sinut.</p>
      <button className="button-main" style={{ marginTop: 24 }} onClick={onLogout}>
        Kirjaudu ulos
      </button>
    </div>
  );
}

export default NewUserPendingPage;