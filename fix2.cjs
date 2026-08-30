const fs = require('fs');
let content = fs.readFileSync('src/components/SwarmGrid.tsx', 'utf8');

const anchor = '{/* Dynamic side-by-side grid / mobile snap carousel */}';
const replacement = `
      <AnimatePresence>
        {lastPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[1600px] mx-auto mb-10 flex justify-end px-4 md:px-0"
          >
            <div className="bg-[var(--pill-bg)] px-6 py-4 rounded-3xl max-w-2xl text-[var(--text-primary)] text-[15px] leading-relaxed shadow-sm border border-[var(--glass-border)] transition-colors duration-700">
              {lastPrompt}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic side-by-side grid / mobile snap carousel */}`;

content = content.replace(anchor, replacement);
fs.writeFileSync('src/components/SwarmGrid.tsx', content);
