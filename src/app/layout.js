import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';

export const metadata = {
  title: 'Sistema de Gestión de Convenios - UNLPam',
  description: 'Facultad de Ingeniería - Universidad Nacional de La Pampa',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}