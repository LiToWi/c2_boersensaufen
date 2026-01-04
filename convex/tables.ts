import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const populatePhysicalTables = mutation({
  handler: async (ctx, _) => {
    [
      ["01", "aboaho", "snuwnyndtefpfqhljpndgzhzmdvdsconc"],
      ["02", "qrtykc", "puqyokxqfoiommsuetyonhcwymzqchzdt"],
      ["03", "bzrbzs", "yxuflkvdjhddeanrpgyecqkkuqazoegba"],
      ["04", "ecxpip", "yxrmawpugifidjbqmmwuefcnandwhvvpv"],
      ["05", "pbzpty", "smsktxesfleyfoaiowlmmbinofniihntp"],
      ["06", "mwsofv", "nvyfcpdkvmbjuaqqmxldhaxdffnopitjw"],
      ["07", "thgaip", "emkcqvrkspicotsximpzcktwvdvsygdkl"],
      ["08", "zjblar", "wdfcgvksmqwoontxxemdwrdnrktnwvkuw"],
      ["09", "eenspv", "jftwizfnmvzbwzunlycrkdclzxyglvytf"],
      ["10", "clmvyd", "edlmzqbgftuwwyedopxeakqhvfnnkgpxs"],
      ["11", "hfxnqq", "itpoqkslcujijpenwhhjfvjjzwacjrhhs"],
      ["12", "qjwyyl", "yxekhrabtikqkfaagitfvzrwjzdgsdxpm"],
      ["13", "vnccwa", "ojmldxlufkqscpnhbgybrmlmuwsskvqwl"],
      ["14", "nfkbuy", "eamsnvmyqfigpahgkfcgcyhbtddphahng"],
      ["15", "rzjsej", "ewrzzbaixwswlcdvlzzzyrafuknfpbixt"],
      ["16", "oerqlf", "yxfjkabtbgmkukhnlidmxmtbvwrcujslw"],
      ["17", "oqeejw", "gtbpyophyrsndfbtasbaogxqqhpcwgwlz"],
      ["18", "helzvs", "yuoxcpfpucphywcgyjvmkgzthvwirkmqw"],
      ["19", "xmtfcn", "snmgtdlzvlxqbodfaypaeuhohkonozwyc"],
      ["20", "qnwivi", "ocwgprvoovwnkbavoeeavxweembqfgsdv"],
    ].map(
      async (n) =>
        await ctx.db.insert("tables", {
          name: n[0],
          password: n[1],
          token: n[2],
        }),
    );
  },
});

export const getTableByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tables")
      .filter((q) => q.eq(q.field("token"), args.token))
      .unique();
  },
});

// This should be a query, not a mutation
export const getTableByName = query({
    args: { name: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db.query('tables')
            .filter(q => q.eq(q.field('name'), args.name))
            .first();
    },
});

// Keep this as a mutation since it modifies/validates data
export const validateTablePassword = mutation({
    args: {
        tableId: v.id('tables'),
        password: v.string()
    },
    handler: async (ctx, args) => {
        const table = await ctx.db.get(args.tableId);
        if (!table) {
            throw new Error('Table not found');
        }

        // Add your password validation logic here
        // For example, using bcrypt:
        // const isValid = await bcrypt.compare(args.password, table.password);
        if (table.password !== args.password) {
            throw new Error('Invalid password');
        }

        return true;
    },
});

// Cleanup mutation: remove duplicate tables, keep only one per name
export const cleanupDuplicateTables = mutation({
    handler: async (ctx, _) => {
        const allTables = await ctx.db.query('tables').collect();
        const seen = new Set<string>();
        let removed = 0;

        for (const table of allTables) {
            if (seen.has(table.name)) {
                // Duplicate; remove it
                await ctx.db.delete(table._id);
                removed++;
            } else {
                seen.add(table.name);
            }
        }

        return { removed, remaining: seen.size };
    },
});
