import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Student from './pages/Student';
import Teacher from './pages/Teacher';
import Admin from './pages/Admin';
import Library from './pages/Library';

function RequireAuth({ element }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return <Navigate to="/login" />;
  return element;
}

function PrivateRoute({ element, role }) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return <Navigate to="/login" />;
  if (user.role !== role) return <Navigate to="/login" />;
  return element;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/student" element={<PrivateRoute element={<Student />} role="student" />} />
        <Route path="/teacher" element={<PrivateRoute element={<Teacher />} role="teacher" />} />
        <Route path="/admin" element={<PrivateRoute element={<Admin />} role="admin" />} />
        <Route path="/library" element={<RequireAuth element={<Library />} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;