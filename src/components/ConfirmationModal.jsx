import { AlertTriangle, CheckCircle, Info, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';

/**
 * ConfirmationModal - Reusable confirmation popup for admin actions
 * Optimized for mobile view with better touch targets and sizing
 */
const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning', // 'warning' | 'danger' | 'success' | 'info'
    isLoading = false
}) => {
    if (!isOpen) return null;

    // Theme configurations based on type
    const themes = {
        warning: {
            icon: AlertTriangle,
            iconBg: 'bg-amber-100',
            iconColor: 'text-amber-600',
            confirmBtn: 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white',
        },
        danger: {
            icon: Trash2,
            iconBg: 'bg-red-100',
            iconColor: 'text-red-600',
            confirmBtn: 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white',
        },
        success: {
            icon: CheckCircle,
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
            confirmBtn: 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white',
        },
        info: {
            icon: Info,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
            confirmBtn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white',
        }
    };

    const theme = themes[type] || themes.warning;
    const Icon = theme.icon;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            style={{ touchAction: 'none' }}
            onClick={(e) => {
                if (e.target === e.currentTarget && !isLoading) {
                    onClose();
                }
            }}
        >
            <div
                className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Content */}
                <div className="p-5 sm:p-6">
                    {/* Icon */}
                    <div className="flex justify-center mb-3 sm:mb-4">
                        <div className={`${theme.iconBg} rounded-full p-2.5 sm:p-3`}>
                            <Icon className={`w-6 h-6 sm:w-8 sm:h-8 ${theme.iconColor}`} />
                        </div>
                    </div>

                    {/* Title */}
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 text-center mb-1.5 sm:mb-2">
                        {title}
                    </h2>

                    {/* Message */}
                    <p className="text-gray-600 text-center text-sm leading-relaxed">
                        {message}
                    </p>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 sm:px-6 sm:pb-6 flex gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-3 font-medium text-base touch-manipulation active:scale-[0.98] transition-transform"
                    >
                        {cancelText}
                    </Button>
                    <Button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className={`flex-1 py-3 font-medium text-base touch-manipulation active:scale-[0.98] transition-transform ${theme.confirmBtn}`}
                    >
                        {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            confirmText
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
