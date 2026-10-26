import { useEffect } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import AppLayout, { RequireCustomer } from './app/AppLayout'
import AppBookings from './app/pages/Bookings'
import AppCheckout from './app/pages/Checkout'
import AppDateTime from './app/pages/DateTime'
import AppFavourites from './app/pages/Favourites'
import AppHome from './app/pages/Home'
import AppPayment from './app/pages/Payment'
import AppProfile from './app/pages/Profile'
import AppSalon from './app/pages/Salon'
import AppServices from './app/pages/Services'
import AppSignIn from './app/pages/SignIn'
import AppStylist from './app/pages/Stylist'
import Footer from './components/Footer'
import Header from './components/Header'
import Bookings from './pages/Bookings'
import Explore from './pages/Explore'
import SalonDetails from './pages/SalonDetails'
import Tracker from './pages/Tracker'
import { usePortal } from './portal/context'
import { homeFor } from './portal/hooks'
import Login from './portal/Login'
import PortalLayout, { RequireRole } from './portal/PortalLayout'
import { DeskShell } from './portal/desk/DeskProvider'
import Agents from './portal/pages/Agents'
import Approvals from './portal/pages/Approvals'
import Attendance from './portal/pages/Attendance'
import Calendar from './portal/pages/Calendar'
import Checkout from './portal/pages/Checkout'
import Clients from './portal/pages/Clients'
import Fees from './portal/pages/Fees'
import Health from './portal/pages/Health'
import Inventory from './portal/pages/Inventory'
import Followups from './portal/pages/Followups'
import Leads from './portal/pages/Leads'
import Leave from './portal/pages/Leave'
import Live from './portal/pages/Live'
import MyDay from './portal/pages/MyDay'
import Occupancy from './portal/pages/Occupancy'
import Onboard from './portal/pages/Onboard'
import Onboardings from './portal/pages/Onboardings'
import Overview from './portal/pages/Overview'
import Payroll from './portal/pages/Payroll'
import Performance from './portal/pages/Performance'
import Pipeline from './portal/pages/Pipeline'
import Queue from './portal/pages/Queue'
import Reports, { ReportDetail } from './portal/pages/Reports'
import Revenue from './portal/pages/Revenue'
import Salons from './portal/pages/Salons'
import Services from './portal/pages/Services'
import Solo from './portal/pages/Solo'
import Staff from './portal/pages/Staff'
import Tokens from './portal/pages/Tokens'
import Users from './portal/pages/Users'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function CustomerLayout() {
  return (
    <>
      <Header />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  )
}

function PortalHome() {
  const { user } = usePortal()
  return <Navigate to={homeFor(user)} replace />
}

const only = (roles, element) => <RequireRole roles={roles}>{element}</RequireRole>

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<Explore />} />
          <Route path="/salon/:id" element={<SalonDetails />} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/bookings" element={<Bookings />} />
        </Route>

        {/* Mobile customer app: browsing is open, booking and bookings need a signed-in customer */}
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<AppHome />} />
          <Route path="salon/:id" element={<AppSalon />} />
          <Route path="book/:id/stylist" element={<AppStylist />} />
          <Route path="book/:id/services" element={<AppServices />} />
          <Route path="book/:id/time" element={<AppDateTime />} />
          <Route path="book/:id/checkout" element={<RequireCustomer><AppCheckout /></RequireCustomer>} />
          <Route path="book/:id/pay" element={<RequireCustomer><AppPayment /></RequireCustomer>} />
          <Route path="bookings" element={<RequireCustomer><AppBookings /></RequireCustomer>} />
          <Route path="favourites" element={<AppFavourites />} />
          <Route path="profile" element={<AppProfile />} />
          <Route path="login" element={<AppSignIn />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>

        <Route path="/portal/login" element={<Login />} />
        <Route path="/portal" element={<PortalLayout />}>
          <Route index element={<PortalHome />} />
          <Route element={only(['frontdesk'], <DeskShell />)}>
            <Route path="queue" element={<Queue />} />
            <Route path="tokens" element={<Tokens />} />
            <Route path="revenue" element={<Revenue />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="clients" element={<Clients />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="staff" element={<Staff />} />
            <Route path="services" element={<Services />} />
            <Route path="occupancy" element={<Occupancy />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="leave" element={<Leave />} />
            <Route path="payroll" element={<Payroll />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/:reportKey" element={<ReportDetail />} />
          </Route>
          <Route path="my-day" element={only(['stylist'], <MyDay />)} />
          <Route path="solo" element={only(['stylist'], <Solo />)} />
          <Route path="onboard" element={only(['agent'], <Onboard />)} />
          <Route path="followups" element={only(['agent'], <Followups />)} />
          <Route path="leads" element={only(['agent'], <Leads />)} />
          <Route path="onboardings" element={only(['agent'], <Onboardings />)} />
          <Route path="performance" element={only(['agent'], <Performance />)} />
          <Route path="salons" element={only(['agent', 'manager', 'admin'], <Salons />)} />
          <Route path="overview" element={only(['manager', 'admin'], <Overview />)} />
          <Route path="approvals" element={only(['manager', 'admin'], <Approvals />)} />
          <Route path="live" element={only(['manager', 'admin'], <Live />)} />
          <Route path="pipeline" element={only(['manager', 'admin'], <Pipeline />)} />
          <Route path="agents" element={only(['manager', 'admin'], <Agents />)} />
          <Route path="fees" element={only(['manager', 'admin'], <Fees />)} />
          <Route path="health" element={only(['manager', 'admin'], <Health />)} />
          <Route path="users" element={only(['admin'], <Users />)} />
          <Route path="*" element={<PortalHome />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
