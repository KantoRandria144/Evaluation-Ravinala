import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// material-ui
import { useTheme } from '@mui/material/styles';
import {
    Drawer,
    Fab,
    Grid,
    IconButton,
    Slider,
    Tooltip,
    Typography
} from '@mui/material';
import { IconSettings } from '../../../node_modules/@tabler/icons-react';

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar';

// project imports
import { gridSpacing } from 'store/constant';
import { SET_BORDER_RADIUS, SET_FONT_FAMILY } from 'store/actions';
import SubCard from 'ui-component/cards/SubCard';
import AnimateButton from 'ui-component/extended/AnimateButton';

// concat 'px'
function valueText(value) {
    return `${value}px`;
}

// ==============================|| LIVE CUSTOMIZATION ||============================== //

const Customization = () => {
    const theme = useTheme();
    const dispatch = useDispatch();
    const customization = useSelector((state) => state.customization);

    // drawer on/off
    const [open, setOpen] = useState(false);
    const handleToggle = () => {
        setOpen(!open);
    };

    // Set font family to Century Gothic on mount and apply enhanced font smoothing for better readability
    useEffect(() => {
        dispatch({ type: SET_FONT_FAMILY, fontFamily: `'Century Gothic', sans-serif` });

        // Inject global styles for improved font rendering and readability
        const style = document.createElement('style');
        style.textContent = `
            * {
                -webkit-font-smoothing: subpixel-antialiased !important;
                -moz-osx-font-smoothing: grayscale !important;
                text-rendering: optimizeLegibility !important;
                font-smooth: always !important;
                letter-spacing: 0.01em !important;
            }
            body {
                font-family: 'Century Gothic', sans-serif !important;
                font-weight: 400 !important;
                line-height: 1.5 !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            document.head.removeChild(style);
        };
    }, [dispatch]);

    // state - border radius
    const [borderRadius, setBorderRadius] = useState(customization.borderRadius);
    const handleBorderRadius = (event, newValue) => {
        setBorderRadius(newValue);
    };

    useEffect(() => {
        dispatch({ type: SET_BORDER_RADIUS, borderRadius });
    }, [dispatch, borderRadius]);

    return (
        <>
            {/* toggle button */}
            <Tooltip title="Live Customize">
                <Fab
                    component="div"
                    onClick={handleToggle}
                    size="medium"
                    variant="circular"
                    color="secondary"
                    sx={{
                        borderRadius: 0,
                        borderTopLeftRadius: '50%',
                        borderBottomLeftRadius: '50%',
                        borderTopRightRadius: '50%',
                        borderBottomRightRadius: '4px',
                        top: '25%',
                        position: 'fixed',
                        right: 10,
                        zIndex: theme.zIndex.speedDial
                    }}
                >
                    <AnimateButton type="rotate">
                        <IconButton color="inherit" size="large" disableRipple>
                            <IconSettings />
                        </IconButton>
                    </AnimateButton>
                </Fab>
            </Tooltip>

            <Drawer
                anchor="right"
                onClose={handleToggle}
                open={open}
                PaperProps={{
                    sx: {
                        width: 280,
                        WebkitFontSmoothing: 'subpixel-antialiased',
                        MozOsxFontSmoothing: 'grayscale',
                        fontSmooth: 'always',
                        transform: 'translateZ(0)',
                        WebkitTransform: 'translateZ(0)',
                        letterSpacing: '0.01em'
                    }
                }}
            >
                <PerfectScrollbar component="div">
                    <Grid container spacing={gridSpacing} sx={{ p: 3 }}>
                        <Grid item xs={12}>
                            {/* border radius */}
                            <SubCard title="Border Radius">
                                <Grid item xs={12} container spacing={2} alignItems="center" sx={{ mt: 2.5 }}>
                                    <Grid item>
                                        <Typography variant="h6" color="secondary" sx={{ fontWeight: 400, letterSpacing: '0.01em' }}>
                                            4px
                                        </Typography>
                                    </Grid>
                                    <Grid item xs>
                                        <Slider
                                            size="small"
                                            value={borderRadius}
                                            onChange={handleBorderRadius}
                                            getAriaValueText={valueText}
                                            valueLabelDisplay="on"
                                            aria-labelledby="discrete-slider-small-steps"
                                            marks
                                            step={2}
                                            min={4}
                                            max={24}
                                            color="secondary"
                                            sx={{
                                                '& .MuiSlider-valueLabel': {
                                                    color: 'secondary.light',
                                                    fontWeight: 400,
                                                    letterSpacing: '0.01em'
                                                }
                                            }}
                                        />
                                    </Grid>
                                    <Grid item>
                                        <Typography variant="h6" color="secondary" sx={{ fontWeight: 400, letterSpacing: '0.01em' }}>
                                            24px
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </SubCard>
                        </Grid>
                    </Grid>
                </PerfectScrollbar>
            </Drawer>
        </>
    );
};

export default Customization;