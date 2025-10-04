import { createBrowserRouter, RouterProvider} from 'react-router'
import AuthLayout from './auth/AuthLayout'
import SignIn from './auth/signin'
import SignUp from './auth/signup'
import Hero from './components/dashboard'
import Feature from './components/Feature'
import PrivateRoute from './components/PrivateRoute'
function App() {
  const router = createBrowserRouter([
    {
      path:'/feature',
      element:<Feature/>
    },
    {
      path: '/dashboard',
      element: <PrivateRoute />, // Protects the dashboard route
      children: [
        {
          index: true, // Renders Hero at exactly /dashboard
          element: <Hero />,
        },
      ],
    },
    {
      element: <AuthLayout />,
      children: [
        {
          path: '/signup',
          element: <SignUp />,
        },
        {
          path: '/signin',
          element: <SignIn />,
        }
      ]
    }
  ])
  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}

export default App