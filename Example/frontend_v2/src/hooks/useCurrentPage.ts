import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export const useCurrentPage = () => {
    const pathname = usePathname()
    const [currentPage, setCurrentPage] = useState<string>('')

    useEffect(() => {
        setCurrentPage(pathname)
    }, [pathname])

    return {
        currentPage,
        isDashboardPage: currentPage === '/dashboard',
        isDevicePage: currentPage === '/dashboard/device',
        isNotificationsPage: currentPage === '/dashboard/notifications',
        isUsersPage: currentPage === '/dashboard/users',
        isSimulatorPage: currentPage === '/dashboard/simulator'
    }
}
